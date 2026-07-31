import { appRepository } from "../repositories/AppRepository";
import { SyncManager } from "../services/SyncManager";

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
    splash_loading_screen_background?: {
        url: string;
    } | string;
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
    programs?: ProgramsData[];
    event_block_heading?: string;
    event_view_all_label?: string;
    featured_event?: EventsData; // WordPress Post Object structure
    trails_block_heading?: string;
    trail_links_to_show?: number | string;
    trails?: TrailsData[];
}

export interface ProgramsData {
    id?: number;
    updated_at?: string;
    program_name?: string;
    thumbnail_image?: Record<string, unknown>;
    short_description?: string;
    full_description?: string;
    schedule__dates?: string;
    location?: unknown[];
    registration_link?: string;
    category__tag?: unknown[];
    featured?: boolean;
    active?: boolean;
    sort_order?: string;
}

export interface TrailsData {
    id?: number;
    updated_at?: string;
    trail_name?: string;
    featured_image?: boolean | Record<string, unknown>;
    description?: string;
    trailhead_address?: string;
    distance?: string;
    seasonal_closure?: string;
    active?: boolean;
    sort_order?: string;
}

export interface EventsData {
    id?: number;
    updated_at?: string;
    event_name?: string;
    thumbnail_image?: Record<string, unknown>;
    short_description?: string;
    full_description?: string;
    "start_date_&_time"?: string;
    "end_date_&_time"?: string;
    location_name?: string;
    location_address?: string;
    location_poi_link?: unknown[];
    registration__ticket_link?: string;
    category__tag?: string;
    featured?: boolean;
    active?: boolean;
}

export interface RentalsData {
    id?: number;
    updated_at?: string;
    rental_name?: string;
    additional_images?: any;
    short_description?: string;
    full_description?: string;
    capacity?: string;
    rental_type?: string;
    availability_notes?: string;
    pricing_notes?: string;
    cta_1_label_?: string;
    cta_1_link?: string;
    cta_2_label?: string;
    cta_2_link?: string;
    map_poi_link?: unknown[];
    active?: boolean;
    sort_order?: string;
}

export interface TipsData {
    id?: number;
    updated_at?: string;
    tip_title?: string;
    tip_body?: string;
    tip_icon__image?: Record<string, unknown>;
    category__tag?: any;
    active?: boolean;
    sort_order?: string;
}

export interface PlanYourTripData {
    screen_title?: string;
    hero_image?: any;
    intro_paragraph?: string;
    content_sections?: any[];
}

export interface CamerasData {
    id?: number;
    updated_at?: string;
    camera_name?: string;
    stream_url?: string;
    stream_type?: string;
    thumbnail__poster?: Record<string, unknown>;
    description?: string;
    active?: boolean;
    sort_order?: string;
}

export interface VisitorsData {
    screen_title?: string;
    hero?: Record<string, unknown>;
    image_gallery?: unknown[];
    body_copy?: string;
    address?: string;
    phone_number?: string;
    hours_of_operation?: boolean;
    accessibility_notes?: string;
    cta_1_label?: string;
    cta_1_link?: Record<string, unknown>;
    cta_2_label?: string;
    cta_2_link?: Record<string, unknown>;
    map_poi_link?: unknown[];
}

export interface ProgramsSettingData {
    screen_title?: string;
    layout?: string;
    filter_bar_enabled?: boolean;
}

export interface EventSettingsData {
    screen_title?: string;
    past_events_visibility?: string;
    filter_bar_enabled?: boolean;
}

export interface LiveCamSettingsData {
    screen_title?: string;
    offline_message?: string;
    quality_note?: string;
}

export interface TrailSettingsData {
    screen_title?: string;
    filter_bar_enabled?: boolean;
    default_sort?: string;
}

export interface RentalSettingsData {
    screen_title?: string;
    intro_text?: string;
}

export interface TipsScreenSettingsData {
    screen_title?: string;
    intro_paragraph?: string;
    header_icon?: string;
}

export interface MapSettingsData {
    screen_title?: string;
    default_map_center?: Record<string, unknown>;
    latitude?: string;
    longitude?: string;
    default_zoom_level?: string;
    map_style?: string;
}

export interface NavigationData {
    nav_item_label?: string;
    nav_image?: Record<string, unknown> | boolean;
    nav_link?: Record<string, unknown>;
    nav_order?: number;
}

export interface PoisData {
    id?: number;
    updated_at?: string;
    poi_name?: string;
    pin_popup_summary?: string;
    full_description?: string;
    latitude?: string;
    longitude?: string;
    featured_image?: Record<string, unknown>;
    image_gallery?: boolean;
    address?: string;
    handicap_accessible?: boolean;
    open_year_round?: boolean;
    seasonal_notes?: string;
    external_link?: string;
    pin_icon_override?: Record<string, unknown> | boolean;
    active?: boolean;
    sort_order?: string;
}

export interface MappedPoisData extends Omit<PoisData, 'image_gallery'> {
    id: number;
    coordinate: {
        latitude: number;
        longitude: number;
    };
    title: string;
    description: string;
    image_gallery?: any;
}


export interface AppContentData {
    app_branding?: AppBranding;
    popup_content?: PopupContent;
    home_screen?: HomeScreenData;
    programs?: ProgramsData[];
    events?: EventsData[];
    trails?: TrailsData[];
    rentals?: RentalsData[];
    tips?: TipsData[];
    plan_your_trip?: PlanYourTripData;
    cameras?: CamerasData[];
    visitors?: VisitorsData;
    programs_setting?: ProgramsSettingData;
    event_settings?: EventSettingsData;
    live_cam_settings?: LiveCamSettingsData;
    trail_settings?: TrailSettingsData;
    rental_settings?: RentalSettingsData;
    tips_screen_settings?: TipsScreenSettingsData;
    map_settings?: MapSettingsData;
    navigation?: NavigationData[];
    pois?: PoisData[];
}

interface AppContentContextType {
    brandData: AppBranding | null;
    popupData: PopupContent | null;
    homeData: HomeScreenData | null;
    programsData: ProgramsData[] | null;
    eventsData: EventsData[] | null;
    trailsData: TrailsData[] | null;
    rentalsData: RentalsData[] | null;
    tipsData: TipsData[] | null;
    planTripData: PlanYourTripData | null;
    camerasData: CamerasData[] | null;
    visitorsData: VisitorsData | null;
    programsSettingData: ProgramsSettingData | null;
    eventSettingsData: EventSettingsData | null;
    liveCamSettingsData: LiveCamSettingsData | null;
    trailSettingsData: TrailSettingsData | null;
    rentalSettingsData: RentalSettingsData | null;
    tipsScreenSettingsData: TipsScreenSettingsData | null;
    mapSettingsData: MapSettingsData | null;
    navigationData: NavigationData[] | null;
    poisData: MappedPoisData[] | null;
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

    const [apiStatus, setApiStatus] = useState<'fetching' | 'loading' | 'ready'>('fetching');

    // Sync states
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncStatusText, setSyncStatusText] = useState('');
    const [syncError, setSyncError] = useState<string | null>(null);

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

            setProgramsData(recordsMap.programs as ProgramsData[]);
            setEventsData(recordsMap.events as EventsData[]);
            setTrailsData(recordsMap.trails as TrailsData[]);
            setRentalsData(recordsMap.rentals as RentalsData[]);
            setTipsData(recordsMap.tips as TipsData[]);
            setCamerasData(recordsMap.cameras as CamerasData[]);

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
                setPoisData(mappedPois);
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

        // FORCE A FULL SYNC ONCE to recover the lost home_screen ID
        // TODO: Remove this line after testing so it doesn't do a full sync every app boot!
        appRepository.upsertMetadata('last_full_sync', '');

        const success = await SyncManager.fetchAndStoreAll((progress, status) => {
            setSyncProgress(progress);
            setSyncStatusText('Getting things ready...');
            // Load branding early if it has been written to the DB
            try {
                const settingsMap = appRepository.getAllSettings();
                if (settingsMap.app_branding) {
                    setBrandData(settingsMap.app_branding as AppBranding);
                }
            } catch (_) { }
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

        // TODO: Remove this line after testing so it doesn't do a full sync every app boot!
        appRepository.upsertMetadata('last_full_sync', '');

        setIsSyncing(true);
        try {
            const hasUpdates = await SyncManager.triggerDeltaSync();
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
        const isComplete = SyncManager.isSyncComplete();
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
