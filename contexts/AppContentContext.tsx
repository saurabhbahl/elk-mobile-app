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
    refreshData: () => void;
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

    const fetchData = async () => {
        setApiStatus('fetching');
        try {
            const timestamp = new Date().getTime();
            const response = await fetch(`https://ftfgifts.com/elk/wp-json/elk/v1/data?_t=${timestamp}`, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Cookie': 'wordpress_logged_in_cache_bypass=1'
                }
            });
            const json: AppContentData = await response.json();

            if (json.app_branding) {
                setBrandData(json.app_branding);
            }
            if (json.popup_content) {
                setPopupData(json.popup_content);
            }
            if (json.home_screen) {
                setHomeData(json.home_screen);
            }
            if (json.programs) {
                setProgramsData(json.programs);
            }
            if (json.events) {
                setEventsData(json.events);
            }
            if (json.trails) {
                setTrailsData(json.trails);
            }
            if (json.rentals) {
                setRentalsData(json.rentals);
            }
            if (json.tips) {
                setTipsData(json.tips);
            }
            if (json.plan_your_trip) {
                setPlanTripData(json.plan_your_trip);
            }
            if (json.cameras) {
                setCamerasData(json.cameras);
            }
            if (json.visitors) {
                setVisitorsData(json.visitors);
            }
            if (json.programs_setting) {
                setProgramsSettingData(json.programs_setting);
            }
            if (json.event_settings) {
                setEventSettingsData(json.event_settings);
            }
            if (json.live_cam_settings) {
                setLiveCamSettingsData(json.live_cam_settings);
            }
            if (json.trail_settings) {
                setTrailSettingsData(json.trail_settings);
            }
            if (json.rental_settings) {
                setRentalSettingsData(json.rental_settings);
            }
            if (json.tips_screen_settings) {
                setTipsScreenSettingsData(json.tips_screen_settings);
            }
            if (json.map_settings) {
                setMapSettingsData(json.map_settings);
            }
            if (json.navigation) {
                setNavigationData(json.navigation);
            }
            if (json.pois) {
                const mappedPois = json.pois.map((poi: any) => ({
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
        } catch (error) {
            console.log("Failed to fetch app data:", error);
        } finally {
            setApiStatus('loading');
            setTimeout(() => {
                setApiStatus('ready');
            }, 1000);
        }
    };

    useEffect(() => {
        fetchData();
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
        refreshData: fetchData
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
