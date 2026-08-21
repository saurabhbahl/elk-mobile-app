import { useOfflineMap } from "../hooks/useOfflineMap";
import { appRepository } from "../repositories/AppRepository";
import { SyncManager } from "../services/SyncManager";
import { preloadManifestCache } from "../utils/imageCache";

import NetInfo from '@react-native-community/netinfo';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import {
    AppBranding,
    AppContentDataContextType, AppContentSyncContextType,
    CamerasData,
    EventsData,
    EventSettingsData,
    HomeScreenData,
    LiveCamSettingsData,
    MappedPoisData,
    MapSettingsData, NavigationData,
    PlanYourTripData,
    PoisData,
    PopupContent,
    ProgramsData,
    ProgramsSettingData,
    RentalsData,
    RentalSettingsData,
    TipsData,
    TipsScreenSettingsData,
    TrailsData,
    TrailSettingsData,
    VisitorsData
} from '../types/app';
export * from '../types/app';

const AppContentDataContext = createContext<AppContentDataContextType | undefined>(undefined);
const AppContentSyncContext = createContext<AppContentSyncContextType | undefined>(undefined);

export const AppContentProvider = ({ children }: { children: ReactNode }) => {
    const {
        isDownloading: isMapDownloading,
        downloadProgress: mapDownloadProgress,
        downloadMap,
        silentUpdateMap,
        saveConsent,
        checkMapStatus,
    } = useOfflineMap();

    const [initialSyncPhase, setInitialSyncPhase] = useState<'idle' | 'content' | 'map' | 'routes' | 'complete'>('idle');

    const [brandData, setBrandData] = useState<AppBranding | null>(null);
    const [popupData, setPopupData] = useState<PopupContent | null>(null);
    const [homeData, setHomeData] = useState<HomeScreenData | null>(null);
    const [programsData, setProgramsData] = useState<ProgramsData[] | null>(null);
    const [eventsData, setEventsData] = useState<EventsData[] | null>(null);
    const [trailsData, setTrailsData] = useState<TrailsData[] | null>(null);
    const [rentalsData, setRentalsData] = useState<RentalsData[] | null>(null);
    const [tipsData, setTipsData] = useState<TipsData[] | null>(null);
    const [planTripData, setPlanTripData] = useState<PlanYourTripData | null>(null);
    const [camerasData, setCamerasData] = useState<CamerasData[] | null>(null);
    const [visitorsData, setVisitorsData] = useState<VisitorsData | null>(null);
    const [programsSettingData, setProgramsSettingData] = useState<ProgramsSettingData | null>(null);
    const [eventSettingsData, setEventSettingsData] = useState<EventSettingsData | null>(null);
    const [liveCamSettingsData, setLiveCamSettingsData] = useState<LiveCamSettingsData | null>(null);
    const [trailSettingsData, setTrailSettingsData] = useState<TrailSettingsData | null>(null);
    const [rentalSettingsData, setRentalSettingsData] = useState<RentalSettingsData | null>(null);
    const [tipsScreenSettingsData, setTipsScreenSettingsData] = useState<TipsScreenSettingsData | null>(null);
    const [mapSettingsData, setMapSettingsData] = useState<MapSettingsData | null>(null);
    const [navigationData, setNavigationData] = useState<NavigationData[] | null>(null);
    const [poisData, setPoisData] = useState<MappedPoisData[] | null>(null);

    const [apiStatus, setApiStatus] = useState<'fetching' | 'loading' | 'ready'>('loading');

    // Sync states
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncStatusText, setSyncStatusText] = useState('');
    const [syncError, setSyncError] = useState<string | null>(null);

    useEffect(() => {
        if (initialSyncPhase === 'map' && isMapDownloading) {
            const overallProgress = 0.3 + mapDownloadProgress * 0.7; // Scale 30% - 100%
            setSyncProgress(overallProgress);
            setSyncStatusText("Downloading map data...");
        }
    }, [initialSyncPhase, isMapDownloading, mapDownloadProgress]);

    // Load data from local SQLite database into memory
    const loadFromSQLite = () => {
        try {
            // Guarantee the database is clean from expired events before loading them into memory
            SyncManager.cleanupExpiredEvents();

            const settingsMap = appRepository.getAllSettings();

            if (settingsMap.app_branding && !Array.isArray(settingsMap.app_branding)) {
                setBrandData(settingsMap.app_branding as AppBranding);
            }
            if (settingsMap.popup_content) setPopupData(settingsMap.popup_content as PopupContent);
            if (settingsMap.home_screen) {
                const hs = settingsMap.home_screen as HomeScreenData;

                // Dynamically update featured event with latest data from events table
                // and filter it out if it has expired so the ID is not permanently lost!

                if (hs.featured_event) {
                    const isArray = Array.isArray(hs.featured_event);
                    const eventObj = isArray ? (hs.featured_event as any)[0] : hs.featured_event;

                    if (eventObj && eventObj.id) {
                        const recordsMap = appRepository.getAllRecords();
                        const latestEvent = (recordsMap.events as any[])?.find((e: any) => String(e.id) === String(eventObj.id));


                        let targetEvent = eventObj;
                        if (latestEvent) {
                            targetEvent = { ...eventObj, ...latestEvent };
                        }

                        const visibility = (settingsMap.event_settings as any)?.past_events_visibility;
                        const isExpired = SyncManager.isEventExpired(targetEvent, visibility);

                        if (isExpired) {
                            // Hide it in React State if expired
                            hs.featured_event = [] as any;
                        } else {
                            // Update React State with latest future date
                            hs.featured_event = (isArray ? [targetEvent] : targetEvent) as any;
                        }
                    }
                }

                setHomeData(hs);
            }
            if (settingsMap.plan_your_trip) setPlanTripData(settingsMap.plan_your_trip);
            if (settingsMap.visitors) setVisitorsData(settingsMap.visitors);
            if (settingsMap.programs_setting) setProgramsSettingData(settingsMap.programs_setting);
            if (settingsMap.event_settings) setEventSettingsData(settingsMap.event_settings);
            if (settingsMap.live_cam_settings) setLiveCamSettingsData(settingsMap.live_cam_settings);
            if (settingsMap.trail_settings) setTrailSettingsData(settingsMap.trail_settings);
            if (settingsMap.rental_settings) setRentalSettingsData(settingsMap.rental_settings);
            if (settingsMap.tips_screen_settings) setTipsScreenSettingsData(settingsMap.tips_screen_settings);
            if (settingsMap.map_settings) setMapSettingsData(settingsMap.map_settings);
            if (settingsMap.navigation) setNavigationData(settingsMap.navigation as NavigationData[]);

            const recordsMap = appRepository.getAllRecords();

            const sortBySortOrder = (arr: any[]) => {
                if (!arr || !Array.isArray(arr)) return [];
                return [...arr].sort((a, b) => {
                    const orderA = a.sort_order !== undefined && a.sort_order !== null && a.sort_order !== '' ? parseInt(a.sort_order, 10) : 99999;
                    const orderB = b.sort_order !== undefined && b.sort_order !== null && b.sort_order !== '' ? parseInt(b.sort_order, 10) : 99999;
                    return orderA - orderB;
                });
            };

            setProgramsData(sortBySortOrder(recordsMap.programs) as ProgramsData[]);
            setEventsData(sortBySortOrder(recordsMap.events) as EventsData[]);
            setTrailsData(sortBySortOrder(recordsMap.trails) as TrailsData[]);
            setRentalsData(sortBySortOrder(recordsMap.rentals) as RentalsData[]);
            setTipsData(sortBySortOrder(recordsMap.tips) as TipsData[]);
            setCamerasData(sortBySortOrder(recordsMap.cameras) as CamerasData[]);

            if (recordsMap.pois) {
                const mappedPois = (recordsMap.pois as PoisData[]).map((poi: PoisData) => ({
                    ...poi,
                    id: poi.id || 0,
                    coordinate: {
                        latitude: parseFloat(poi.latitude || '0'),
                        longitude: parseFloat(poi.longitude || '0'),
                    },
                    title: poi.poi_name || '',
                    description: poi.pin_popup_summary || poi.full_description || '',
                }));
                setPoisData(sortBySortOrder(mappedPois) as any[]);
            }

            console.log("[SQLite] Loaded cached data into React Context.");
        } catch (e) {
            console.error("Failed to load data from SQLite:", e);
        }
    };

    const performInitialSync = async (): Promise<boolean> => {
        setIsSyncing(true);
        setSyncError(null);
        setSyncProgress(0);
        setSyncStatusText("Getting things ready...");
        setInitialSyncPhase('content');


        try {
            const success = await SyncManager.fetchAndStoreAll((progress, status) => {
                setSyncProgress(progress * 0.3); // Scale content sync to 0% - 30%
                setSyncStatusText(status);
                // Load branding early if it has been written to the DB
                try {
                    const settingsMap = appRepository.getAllSettings();
                    if (settingsMap.app_branding) {
                        setBrandData(settingsMap.app_branding as AppBranding);
                    }
                } catch (_) { }
            });

            if (!success) {
                setSyncError("Please check your internet connection.");
                setIsSyncing(false);
                setInitialSyncPhase('idle');
                return false;
            }

            // Phase 2: Map sync
            setInitialSyncPhase('map');
            setSyncStatusText("Downloading map data...");
            setSyncProgress(0.3);

            try {
                await downloadMap();
                // Check if map downloaded successfully
                const mapValid = await checkMapStatus();
                if (mapValid) {
                    // Save consent as yes on successful download
                    await saveConsent('yes');
                } else {
                    console.warn("[Sync] Map download did not complete successfully, but continuing initial sync.");
                }
            } catch (mapErr) {
                console.warn("[Sync] Error downloading map during initial sync:", mapErr);
            }

            // // Phase 3: Route preload
            // setInitialSyncPhase('routes');
            // setSyncStatusText("Downloading map data...");
            // setSyncProgress(0.9);

            // try {
            //     const recordsMap = appRepository.getAllRecords();
            //     if (recordsMap.pois) {
            //         const mappedPois = (recordsMap.pois as any[]).map((poi: any) => ({
            //             id: poi.id || 0,
            //             coordinate: {
            //                 latitude: parseFloat(poi.latitude || '0'),
            //                 longitude: parseFloat(poi.longitude || '0'),
            //             }
            //         }));

            //         const { preloadAllRoutesHelper } = require('../hooks/useRoutePreloader');
            //         await preloadAllRoutesHelper(mappedPois, (p: any) => {
            //             setSyncProgress(0.9 + (p.percentage / 100) * 0.1);
            //         });
            //     }
            // } catch (err) {
            //     console.warn("[Sync] Route preloading failed:", err);
            // }

            setInitialSyncPhase('complete');
            loadFromSQLite();
            setApiStatus('ready');
            setIsSyncing(false);
            return true;
        } catch (err) {
            console.error("Initial sync error:", err);
            setSyncError("Please check your internet connection.");
            setIsSyncing(false);
            setInitialSyncPhase('idle');
            return false;
        }
    };

    // Performs silent background delta sync
    const refreshData = async (): Promise<boolean> => {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) return false;

        // Removed last_full_sync override so the app performs delta checks on boot rather than full syncs, preventing SQLite write lockups and CPU spikes.

        setIsSyncing(true);
        try {
            const hasUpdates = await SyncManager.triggerDeltaSync();
            if (hasUpdates) {
                loadFromSQLite();
            }

            // Fire and forget silent map updates based on timestamp
            silentUpdateMap().catch(e => console.warn("[AppContent] Silent map update failed:", e));

            setIsSyncing(false);
            return true;
        } catch (e) {
            console.error("Delta sync failed:", e);
            setIsSyncing(false);
            return false;
        }
    };

    // Network Reconnection Listener: Immediately trigger delta sync when internet returns after being offline
    const wasOfflineRef = React.useRef(false);
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const isOnline = !!(state.isConnected && state.isInternetReachable !== false);
            if (!isOnline) {
                console.log("[Sync] Device went offline.");
                wasOfflineRef.current = true;
            } else if (wasOfflineRef.current) {
                console.log("[Sync] Network reconnected after being offline! Immediately triggering delta check.");
                wasOfflineRef.current = false;
                refreshData();
            }
        });
        return () => unsubscribe();
    }, []);

    // Boot Logic
    useEffect(() => {
        preloadManifestCache().catch(e => console.warn('[AppContent] Failed to preload manifest:', e));
        const isComplete = SyncManager.isSyncComplete();
        if (isComplete) {
            loadFromSQLite();
            setApiStatus('ready');

            // Trigger background delta checks on boot
            refreshData();
        } else {
            setApiStatus('loading');
            performInitialSync();
        }
    }, []);

    const dataContextValue = React.useMemo(() => ({
        brandData,
        popupData,
        homeData,
        programsData,
        eventsData,
        trailsData,
        rentalsData,
        tipsData,
        planTripData,
        camerasData,
        visitorsData,
        programsSettingData,
        eventSettingsData,
        liveCamSettingsData,
        trailSettingsData,
        rentalSettingsData,
        tipsScreenSettingsData,
        mapSettingsData,
        navigationData,
        poisData,
        apiStatus
    }), [
        brandData,
        popupData,
        homeData,
        programsData,
        eventsData,
        trailsData,
        rentalsData,
        tipsData,
        planTripData,
        camerasData,
        visitorsData,
        programsSettingData,
        eventSettingsData,
        liveCamSettingsData,
        trailSettingsData,
        rentalSettingsData,
        tipsScreenSettingsData,
        mapSettingsData,
        navigationData,
        poisData,
        apiStatus
    ]);

    const syncContextValue = React.useMemo(() => ({
        isSyncing,
        syncProgress,
        syncStatusText,
        syncError,
        refreshData,
        performInitialSync
    }), [
        isSyncing,
        syncProgress,
        syncStatusText,
        syncError,
        refreshData,
        performInitialSync
    ]);

    return (
        <AppContentDataContext.Provider value={dataContextValue}>
            <AppContentSyncContext.Provider value={syncContextValue}>
                {children}
            </AppContentSyncContext.Provider>
        </AppContentDataContext.Provider>
    );
};

export const useAppContent = () => {
    const data = useContext(AppContentDataContext);
    const sync = useContext(AppContentSyncContext);
    if (data === undefined || sync === undefined) {
        throw new Error('useAppContent must be used within an AppContentProvider');
    }
    return { ...data, ...sync };
};

export const useAppContentData = () => {
    const context = useContext(AppContentDataContext);
    if (context === undefined) {
        throw new Error('useAppContentData must be used within an AppContentProvider');
    }
    return context;
};

export const useAppContentSync = () => {
    const context = useContext(AppContentSyncContext);
    if (context === undefined) {
        throw new Error('useAppContentSync must be used within an AppContentProvider');
    }
    return context;
};
