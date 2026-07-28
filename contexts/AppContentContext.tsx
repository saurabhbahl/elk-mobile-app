import { db } from '@/database';
import { fetchAndStoreAll, isSyncComplete, triggerDeltaSync } from '@/database/sync';
import NetInfo from '@react-native-community/netinfo';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export interface AppBranding {
    app_name?: string;
    app_tagline?: string;
    logo_primary?: {
        url: string;
    };
    logo_secondary?: {
        url: string;
    };
    brand_color_primary?: string;
    brand_color__secondary?: string;
}

export interface PopupContent {
    popup_enabled: boolean;
    popup_title: string;
    popup_body_copy: string;
    popup_image?: {
        url: string;
    };
    cta_button_label?: string;
    cta_button_link?: string;
    close_button_style?: string;
}

export interface HomeScreenData {
    hero_welcome_heading?: string;
    hero_intro_paragraph?: string;
    hero_cta_button_label?: string;
    hero_cta_button_link?: string;
    map_block_heading?: string;
    map_view_button_label?: string;
    programs_block_heading?: string;
    programs_to_display?: number | string;
    programs?: any[];
    event_block_heading?: string;
    event_view_all_label?: string;
    featured_event?: any; // WordPress Post Object structure
    trails_block_heading?: string;
    trail_links_to_show?: number | string;
    trails?: any[];
}

export interface AppContentData {
    app_branding?: AppBranding;
    popup_content?: PopupContent;
    home_screen?: HomeScreenData;
    programs?: any[];
    events?: any[];
    trails?: any[];
    rentals?: any[];
    tips?: any[];
    plan_your_trip?: any;
    cameras?: any[];
    visitors?: any;
    programs_setting?: any;
    event_settings?: any;
    live_cam_settings?: any;
    trail_settings?: any;
    rental_settings?: any;
    tips_screen_settings?: any;
    map_settings?: any;
    navigation?: any[];
    pois?: any[];
}

interface AppContentContextType {
    brandData: AppBranding | null;
    popupData: PopupContent | null;
    homeData: HomeScreenData | null;
    programsData: any[] | null;
    eventsData: any[] | null;
    trailsData: any[] | null;
    rentalsData: any[] | null;
    tipsData: any[] | null;
    planTripData: any | null;
    camerasData: any[] | null;
    visitorsData: any | null;
    programsSettingData: any | null;
    eventSettingsData: any | null;
    liveCamSettingsData: any | null;
    trailSettingsData: any | null;
    rentalSettingsData: any | null;
    tipsScreenSettingsData: any | null;
    mapSettingsData: any | null;
    navigationData: any[] | null;
    poisData: any[] | null;
    apiStatus: 'fetching' | 'loading' | 'ready';
    isSyncing: boolean;
    syncProgress: number;
    syncStatusText: string;
    syncError: string | null;
    refreshData: () => Promise<boolean>;
    performInitialSync: () => Promise<boolean>;
}

const AppContentContext = createContext<AppContentContextType | undefined>(undefined);

export const AppContentProvider = ({ children }: { children: ReactNode }) => {
    const [brandData, setBrandData] = useState<AppBranding | null>(null);
    const [popupData, setPopupData] = useState<PopupContent | null>(null);
    const [homeData, setHomeData] = useState<HomeScreenData | null>(null);
    const [programsData, setProgramsData] = useState<any[] | null>(null);
    const [eventsData, setEventsData] = useState<any[] | null>(null);
    const [trailsData, setTrailsData] = useState<any[] | null>(null);
    const [rentalsData, setRentalsData] = useState<any[] | null>(null);
    const [tipsData, setTipsData] = useState<any[] | null>(null);
    const [planTripData, setPlanTripData] = useState<any | null>(null);
    const [camerasData, setCamerasData] = useState<any[] | null>(null);
    const [visitorsData, setVisitorsData] = useState<any | null>(null);
    const [programsSettingData, setProgramsSettingData] = useState<any | null>(null);
    const [eventSettingsData, setEventSettingsData] = useState<any | null>(null);
    const [liveCamSettingsData, setLiveCamSettingsData] = useState<any | null>(null);
    const [trailSettingsData, setTrailSettingsData] = useState<any | null>(null);
    const [rentalSettingsData, setRentalSettingsData] = useState<any | null>(null);
    const [tipsScreenSettingsData, setTipsScreenSettingsData] = useState<any | null>(null);
    const [mapSettingsData, setMapSettingsData] = useState<any | null>(null);
    const [navigationData, setNavigationData] = useState<any[] | null>(null);
    const [poisData, setPoisData] = useState<any[] | null>(null);

    const [apiStatus, setApiStatus] = useState<'fetching' | 'loading' | 'ready'>('fetching');

    // Sync states
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncStatusText, setSyncStatusText] = useState('');
    const [syncError, setSyncError] = useState<string | null>(null);

    // Load data from local SQLite database into memory
    const loadFromSQLite = () => {
        try {
            // Settings mapping
            const settings = db.getAllSync("SELECT key, json_data FROM app_settings;") as { key: string, json_data: string }[];
            const settingsMap: Record<string, any> = {};
            settings.forEach(s => {
                try {
                    settingsMap[s.key] = JSON.parse(s.json_data);
                } catch (e) {
                    console.error(`Error parsing settings key ${s.key}:`, e);
                }
            });

            if (settingsMap.app_branding) setBrandData(settingsMap.app_branding);
            if (settingsMap.popup_content) setPopupData(settingsMap.popup_content);
            if (settingsMap.home_screen) setHomeData(settingsMap.home_screen);
            if (settingsMap.plan_your_trip) setPlanTripData(settingsMap.plan_your_trip);
            if (settingsMap.visitors) setVisitorsData(settingsMap.visitors);
            if (settingsMap.programs_setting) setProgramsSettingData(settingsMap.programs_setting);
            if (settingsMap.event_settings) setEventSettingsData(settingsMap.event_settings);
            if (settingsMap.live_cam_settings) setLiveCamSettingsData(settingsMap.live_cam_settings);
            if (settingsMap.trail_settings) setTrailSettingsData(settingsMap.trail_settings);
            if (settingsMap.rental_settings) setRentalSettingsData(settingsMap.rental_settings);
            if (settingsMap.tips_screen_settings) setTipsScreenSettingsData(settingsMap.tips_screen_settings);
            if (settingsMap.map_settings) setMapSettingsData(settingsMap.map_settings);
            if (settingsMap.navigation) setNavigationData(settingsMap.navigation);

            // CPT Records mapping
            const records = db.getAllSync("SELECT type, json_data FROM app_records;") as { type: string, json_data: string }[];
            const recordsMap: Record<string, any[]> = {
                programs: [],
                events: [],
                trails: [],
                rentals: [],
                tips: [],
                pois: [],
                cameras: []
            };

            records.forEach(r => {
                try {
                    const parsed = JSON.parse(r.json_data);
                    if (recordsMap[r.type]) {
                        recordsMap[r.type].push(parsed);
                    }
                } catch (e) {
                    console.error(`Error parsing record of type ${r.type}:`, e);
                }
            });

            setProgramsData(recordsMap.programs);
            setEventsData(recordsMap.events);
            setTrailsData(recordsMap.trails);
            setRentalsData(recordsMap.rentals);
            setTipsData(recordsMap.tips);
            setCamerasData(recordsMap.cameras);

            if (recordsMap.pois) {
                const mappedPois = recordsMap.pois.map((poi: any) => ({
                    ...poi,
                    id: parseInt(poi.id, 10),
                    coordinate: {
                        latitude: parseFloat(poi.latitude),
                        longitude: parseFloat(poi.longitude),
                    },
                    title: poi.poi_name || '',
                    description: poi.pin_popup_summary || poi.full_description || '',
                }));
                setPoisData(mappedPois);
            }

            console.log("[SQLite] Loaded cached data into React Context.");
        } catch (e) {
            console.error("Failed to load data from SQLite:", e);
        }
    };

    // Performs initial synchronization
    const performInitialSync = async (): Promise<boolean> => {
        setIsSyncing(true);
        setSyncError(null);
        setSyncProgress(0);
        setSyncStatusText("Getting things ready...");

        const success = await fetchAndStoreAll((progress, status) => {
            setSyncProgress(progress);
            setSyncStatusText('Getting things ready...');
        });

        setIsSyncing(false);

        if (success) {
            loadFromSQLite();
            setApiStatus('loading');
            setTimeout(() => {
                setApiStatus('ready');
            }, 1000);
            return true;
        } else {
            setSyncError("Synchronization failed. Please check your internet connection.");
            return false;
        }
    };

    // Performs silent background delta sync
    const refreshData = async (): Promise<boolean> => {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) return false;

        setIsSyncing(true);
        try {
            const hasUpdates = await triggerDeltaSync();
            if (hasUpdates) {
                loadFromSQLite();
            }
            setIsSyncing(false);
            return true;
        } catch (e) {
            console.error("Delta sync failed:", e);
            setIsSyncing(false);
            return false;
        }
    };

    // Boot Logic
    useEffect(() => {
        const isComplete = isSyncComplete();
        if (isComplete) {
            loadFromSQLite();
            setApiStatus('loading');
            setTimeout(() => {
                setApiStatus('ready');
            }, 1000);

            // Trigger background delta checks on boot
            refreshData();
        } else {
            setApiStatus('fetching'); // Triggers SyncProgressScreen overlay
        }
    }, []);

    const contextValue = React.useMemo(() => ({
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
        apiStatus,
        isSyncing,
        syncProgress,
        syncStatusText,
        syncError,
        refreshData,
        performInitialSync
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
        apiStatus,
        isSyncing,
        syncProgress,
        syncStatusText,
        syncError
    ]);

    return (
        <AppContentContext.Provider value={contextValue}>
            {children}
        </AppContentContext.Provider>
    );
};

export const useAppContent = () => {
    const context = useContext(AppContentContext);
    if (context === undefined) {
        throw new Error('useAppContent must be used within an AppContentProvider');
    }
    return context;
};
