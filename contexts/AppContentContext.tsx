import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    cta_button_link_?: string;
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
}

interface AppContentContextType {
    brandData: AppBranding | null;
    popupData: PopupContent | null;
    homeData: HomeScreenData | null;
    programsData: any[] | null;
    eventsData: any[] | null;
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
    const [apiStatus, setApiStatus] = useState<'fetching' | 'loading' | 'ready'>('fetching');

    const fetchData = async () => {
        setApiStatus('fetching');
        try {
            const timestamp = new Date().getTime();
            const response = await fetch(`https://ftfgifts.com/elk/wp-json/elk/v1/data?_t=${timestamp}`, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
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

    return (
        <AppContentContext.Provider value={{ brandData, popupData, homeData, programsData, eventsData, apiStatus, refreshData: fetchData }}>
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
