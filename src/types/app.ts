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
    brand_color_secondary?: string;
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
    cta_button_link?: any;
    close_button_style?: string;
}

export interface HomeScreenData {
    hero_welcome_heading?: string;
    hero_intro_paragraph?: string;
    hero_cta_button_link?: any;
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
    sponsorship_information?: {
        grant_logo?: { url: string } | null;
        grant_details?: string | null;
    };
}

export interface ProgramsData {
    id?: number;
    updated_at?: string;
    program_name?: string;
    thumbnail_image?: Record<string, unknown>;
    short_description?: string;
    full_description?: string;
    schedule_dates?: string;
    location?: unknown[];
    location_poi_link?: unknown[];
    registration_link?: string;
    category_tag?: unknown[];
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
    location_poi_link?: unknown[];
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
    registration_ticket_link?: string;
    category_tag?: string;
    featured?: boolean;
    active?: boolean;
}

export interface RentalsData {
    id?: number;
    updated_at?: string;
    rental_name?: string;
    featured_image?: boolean | Record<string, unknown>;
    additional_images?: any;
    short_description?: string;
    full_description?: string;
    capacity?: string;
    rental_type?: string;
    availability_notes?: string;
    pricing_notes?: string;
    cta_1_link?: any;
    cta_2_link?: any;
    map_poi_link?: unknown[];
    active?: boolean;
    sort_order?: string;
}

export interface TipsData {
    id?: number;
    updated_at?: string;
    tip_title?: string;
    tip_body?: string;
    tip_icon_image?: Record<string, unknown>;
    category_tag?: any;
    active?: boolean;
    sort_order?: string;
}

export interface PlanYourTripData {
    screen_title?: string;
    hero_image?: any;
    image_gallery?: any[];
    intro_paragraph?: string;
    content_sections?: any[];
}

export interface CamerasData {
    id?: number;
    updated_at?: string;
    camera_name?: string;
    stream_url?: string;
    stream_type?: string;
    thumbnail_poster?: Record<string, unknown>;
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
    hours_of_operation?: any;
    accessibility_notes?: string;
    cta_1_title?: string;
    cta_1_image?: { url: string } | null;
    cta_1_link?: any;
    cta_2_title?: string;
    cta_2_image?: { url: string } | null;
    cta_2_link?: any;
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
    image_gallery?: any[];
}

export interface TipsScreenSettingsData {
    screen_title?: string;
    intro_paragraph?: string;
    header_icon?: string;
    image_gallery?: any[];
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

export interface AppContentDataContextType {
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
}

export interface AppContentSyncContextType {
    isSyncing: boolean;
    syncProgress: number;
    syncStatusText: string;
    syncError: string | null;
    refreshData: () => Promise<boolean>;
    performInitialSync: () => Promise<boolean>;
}

export interface AppContentContextType extends AppContentDataContextType, AppContentSyncContextType { }
