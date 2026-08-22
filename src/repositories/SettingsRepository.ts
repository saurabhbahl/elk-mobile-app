import { BaseRepository } from './BaseRepository';
import { helperExtractImage, helperExtractPoiId } from './utils';

export class SettingsRepository extends BaseRepository<Record<string, unknown>> {
  constructor() {
    super('app_branding');
  }

  upsertAppBranding(branding: any) {
    const name = branding.app_name || null;
    const tagline = branding.app_tagline || null;
    const logo1 = helperExtractImage(branding.logo_primary);
    const logo2 = helperExtractImage(branding.logo_secondary);
    const primary = branding.brand_color_primary || null;
    const sec = branding.brand_color_secondary || null;
    const splash = helperExtractImage(branding.splash_loading_screen_background);

    this.execute(`
      INSERT OR REPLACE INTO app_branding (id, app_name, app_tagline, logo_primary_url, logo_secondary_url, brand_color_primary, brand_color_secondary, splash_background_url)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    `, [name, tagline, logo1, logo2, primary, sec, splash]);
  }

  upsertNavigationLabels(labels: any[]) {
    this.execute(`DELETE FROM navigation_labels;`);
    if (Array.isArray(labels)) {
      labels.forEach((item, idx) => {
        const label = item.nav_item_label || null;
        const icon = helperExtractImage(item.nav_image);
        const link = item.nav_link?.url || (typeof item.nav_link === 'string' ? item.nav_link : null);
        const enabled = item.enabled !== false ? 1 : 0;
        const order = item.nav_order !== undefined ? parseInt(item.nav_order, 10) : idx;

        this.execute(`
          INSERT INTO navigation_labels (label, icon_key, nav_link_url, enabled, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `, [label, icon, link, enabled, order]);
      });
    }
  }

  upsertPopupContent(popup: any) {
    const enabled = popup.popup_enabled ? 1 : 0;
    const title = popup.popup_title || null;
    const body = popup.popup_body_copy || null;
    const img = helperExtractImage(popup.popup_image);
    const link = typeof popup.cta_button_link === 'object' ? JSON.stringify(popup.cta_button_link) : null;
    const closeStyle = popup.close_button_style || null;

    this.execute(`
      INSERT OR REPLACE INTO popup_content (id, popup_enabled, popup_title, popup_body_copy, popup_image_url, cta_button_link, close_button_style)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `, [enabled, title, body, img, link, closeStyle]);
  }

  upsertHomeScreenSettings(hs: any) {
    const welcome = hs.hero_welcome_heading || null;
    const intro = hs.hero_intro_paragraph || null;
    const ctaLink = typeof hs.hero_cta_button_link === 'object' ? JSON.stringify(hs.hero_cta_button_link) : null;
    const mapHeading = hs.map_block_heading || null;
    const mapViewLabel = hs.map_view_button_label || null;
    const programsHeading = hs.programs_block_heading || null;

    let programsDisplay = 4;
    if (hs.programs_to_display !== undefined && hs.programs_to_display !== null && !isNaN(parseInt(hs.programs_to_display, 10))) {
      programsDisplay = parseInt(hs.programs_to_display, 10);
    } else if (Array.isArray(hs.programs)) {
      programsDisplay = hs.programs.length;
    }

    const eventHeading = hs.event_block_heading || null;
    const eventViewAll = hs.event_view_all_label || null;
    let featuredEventId = null;
    if (hs.featured_event) {
      if (Array.isArray(hs.featured_event) && hs.featured_event.length > 0) {
        const first = hs.featured_event[0];
        featuredEventId = typeof first === 'object' ? (first.id || first.ID) : parseInt(first, 10);
      } else if (typeof hs.featured_event === 'object') {
        featuredEventId = hs.featured_event.id || hs.featured_event.ID;
      } else {
        featuredEventId = parseInt(hs.featured_event, 10);
      }
    }
    if (!featuredEventId || isNaN(Number(featuredEventId))) {
      featuredEventId = null;
    }
    const trailsHeading = hs.trails_block_heading || null;

    let trailsShow = 3;
    if (hs.trail_links_to_show !== undefined && hs.trail_links_to_show !== null && !isNaN(parseInt(hs.trail_links_to_show, 10))) {
      trailsShow = parseInt(hs.trail_links_to_show, 10);
    } else if (Array.isArray(hs.trails)) {
      trailsShow = hs.trails.length;
    }

    const grantLogoUrl = hs.sponsorship_information?.grant_logo?.url || (typeof hs.sponsorship_information?.grant_logo === 'string' ? hs.sponsorship_information?.grant_logo : null) || null;
    const grantDetails = hs.sponsorship_information?.grant_details || null;

    this.execute(`
      INSERT OR REPLACE INTO home_screen_settings (id, hero_welcome_heading, hero_intro_paragraph, hero_cta_button_link, map_block_heading, map_view_button_label, programs_block_heading, programs_to_display, event_block_heading, event_view_all_label, featured_event_id, trails_block_heading, trail_links_to_show, grant_logo_url, grant_details)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [welcome, intro, ctaLink, mapHeading, mapViewLabel, programsHeading, programsDisplay, eventHeading, eventViewAll, featuredEventId, trailsHeading, trailsShow, grantLogoUrl, grantDetails]);
  }

  upsertPlanYourTripSettings(pyt: any) {
    const title = pyt.screen_title || null;
    const hero = helperExtractImage(pyt.hero_image);
    const intro = pyt.intro_paragraph || null;

    this.execute(`
      INSERT OR REPLACE INTO plan_your_trip_settings (id, screen_title, hero_image_url, intro_paragraph)
      VALUES (1, ?, ?, ?)
    `, [title, hero, intro]);

    this.execute(`DELETE FROM plan_your_trip_sections;`);
    if (pyt.content_sections && Array.isArray(pyt.content_sections)) {
      pyt.content_sections.forEach((sec: any, idx: number) => {
        const heading = sec.section_heading || null;
        const icon = helperExtractImage(sec.section_icon);
        const body = sec.section_body || null;
        const active = sec.section_active !== false ? 1 : 0;
        const order = sec.sort_order !== undefined ? parseInt(sec.sort_order, 10) : idx;

        this.execute(`
          INSERT INTO plan_your_trip_sections (section_heading, section_icon_url, section_body, section_active, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `, [heading, icon, body, active, order]);
      });
    }

    this.execute(`DELETE FROM plan_your_trip_gallery;`);
    if (pyt.image_gallery && Array.isArray(pyt.image_gallery)) {
      pyt.image_gallery.forEach((img: any) => {
        const url = helperExtractImage(img);
        if (url) {
          this.execute(`INSERT INTO plan_your_trip_gallery (image_url) VALUES (?)`, [url]);
        }
      });
    }
  }

  upsertVisitorsCenterSettings(vc: any) {
    const title = vc.screen_title || null;
    const hero = helperExtractImage(vc.hero || vc.featured_image);
    const body = vc.body_copy || null;
    const addr = vc.address || null;
    const phone = vc.phone_number || null;
    const hours = typeof vc.hours_of_operation === 'string' ? vc.hours_of_operation : (Array.isArray(vc.hours_of_operation) ? JSON.stringify(vc.hours_of_operation) : null);
    const access = vc.accessibility_notes || null;
    const cta1Title = vc.cta_1_title || null;
    const cta1Img = helperExtractImage(vc.cta_1_image);
    const cta1LinkTitle = vc.cta_1_link?.title || (typeof vc.cta_1_link === 'string' ? vc.cta_1_link : null);
    const cta1LinkUrl = vc.cta_1_link?.url || (typeof vc.cta_1_link === 'string' ? vc.cta_1_link : null);
    const cta2Title = vc.cta_2_title || null;
    const cta2Img = helperExtractImage(vc.cta_2_image);
    const cta2LinkTitle = vc.cta_2_link?.title || (typeof vc.cta_2_link === 'string' ? vc.cta_2_link : null);
    const cta2LinkUrl = vc.cta_2_link?.url || (typeof vc.cta_2_link === 'string' ? vc.cta_2_link : null);
    const poiLink = helperExtractPoiId(vc.map_poi_link);

    this.execute(`
      INSERT OR REPLACE INTO visitors_center_settings (id, screen_title, hero_image_url, body_copy, address, phone_number, hours_of_operation, accessibility_notes, cta_1_title, cta_1_image_url, cta_1_link_title, cta_1_link_url, cta_2_title, cta_2_image_url, cta_2_link_title, cta_2_link_url, map_poi_link_id)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, hero, body, addr, phone, hours, access, cta1Title, cta1Img, cta1LinkTitle, cta1LinkUrl, cta2Title, cta2Img, cta2LinkTitle, cta2LinkUrl, poiLink]);

    this.execute(`DELETE FROM visitor_gallery;`);
    if (vc.image_gallery && Array.isArray(vc.image_gallery)) {
      vc.image_gallery.forEach((img: any) => {
        const url = helperExtractImage(img);
        if (url) {
          this.execute(`INSERT INTO visitor_gallery (image_url) VALUES (?)`, [url]);
        }
      });
    }
  }

  upsertProgramsSettings(ps: any) {
    const title = ps.screen_title || null;
    const layout = ps.layout || null;
    const filter = ps.filter_bar_enabled ? 1 : 0;

    this.execute(`
      INSERT OR REPLACE INTO programs_settings (id, screen_title, layout, filter_bar_enabled)
      VALUES (1, ?, ?, ?)
    `, [title, layout, filter]);
  }

  upsertEventsSettings(es: any) {
    const title = es.screen_title || null;
    const past = es.past_events_visibility || null;
    const filter = es.filter_bar_enabled ? 1 : 0;

    this.execute(`
      INSERT OR REPLACE INTO events_settings (id, screen_title, past_events_visibility, filter_bar_enabled)
      VALUES (1, ?, ?, ?)
    `, [title, past, filter]);
  }

  upsertLiveCamSettings(lc: any) {
    const title = lc.screen_title || null;
    const msg = lc.offline_message || null;
    const note = lc.quality_note || null;

    this.execute(`
      INSERT OR REPLACE INTO live_cam_settings (id, screen_title, offline_message, quality_note)
      VALUES (1, ?, ?, ?)
    `, [title, msg, note]);
  }

  upsertTrailSettings(ts: any) {
    const title = ts.screen_title || null;
    const filter = ts.filter_bar_enabled ? 1 : 0;
    const sort = ts.default_sort || null;

    this.execute(`
      INSERT OR REPLACE INTO trail_settings (id, screen_title, filter_bar_enabled, default_sort)
      VALUES (1, ?, ?, ?)
    `, [title, filter, sort]);
  }

  upsertRentalSettings(rs: any) {
    const title = rs.screen_title || null;
    const text = rs.intro_text || null;

    this.execute(`
      INSERT OR REPLACE INTO rental_settings (id, screen_title, intro_text)
      VALUES (1, ?, ?)
    `, [title, text]);

    this.execute(`DELETE FROM rental_settings_gallery;`);
    if (rs.image_gallery && Array.isArray(rs.image_gallery)) {
      rs.image_gallery.forEach((img: any) => {
        const url = helperExtractImage(img);
        if (url) {
          this.execute(`INSERT INTO rental_settings_gallery (image_url) VALUES (?)`, [url]);
        }
      });
    }
  }

  upsertTipsScreenSettings(tss: any) {
    const title = tss.screen_title || null;
    const intro = tss.intro_paragraph || null;
    const icon = helperExtractImage(tss.header_icon);

    this.execute(`
      INSERT OR REPLACE INTO tips_screen_settings (id, screen_title, intro_paragraph, header_icon)
      VALUES (1, ?, ?, ?)
    `, [title, intro, icon]);

    this.execute(`DELETE FROM tips_settings_gallery;`);
    if (tss.image_gallery && Array.isArray(tss.image_gallery)) {
      tss.image_gallery.forEach((img: any) => {
        const url = helperExtractImage(img);
        if (url) {
          this.execute(`INSERT INTO tips_settings_gallery (image_url) VALUES (?)`, [url]);
        }
      });
    }
  }

  upsertMapSettings(ms: any) {
    const title = ms.screen_title || null;
    const lat = ms.default_map_center?.lat || ms.default_map_center?.latitude || ms.latitude || null;
    const lng = ms.default_map_center?.lng || ms.default_map_center?.longitude || ms.longitude || null;
    const zoom = String(ms.default_zoom_level || '');
    const style = ms.map_style || null;

    this.execute(`
      INSERT OR REPLACE INTO map_settings (id, screen_title, default_center_lat, default_center_lng, default_zoom_level, map_style)
      VALUES (1, ?, ?, ?, ?, ?)
    `, [title, lat ? parseFloat(lat) : null, lng ? parseFloat(lng) : null, zoom, style]);
  }

  getAllSettings(): Record<string, unknown> {
    const settingsMap: Record<string, unknown> = {};

    try {
      // 1. App Branding
      const brandingRows = this.query<any>('SELECT * FROM app_branding WHERE id = 1');
      if (brandingRows.length > 0) {
        const row = brandingRows[0];
        settingsMap.app_branding = {
          app_name: row.app_name,
          app_tagline: row.app_tagline,
          logo_primary: row.logo_primary_url ? { url: row.logo_primary_url } : null,
          logo_secondary: row.logo_secondary_url ? { url: row.logo_secondary_url } : null,
          brand_color_primary: row.brand_color_primary,
          brand_color_secondary: row.brand_color_secondary,
          splash_loading_screen_background: row.splash_background_url ? { url: row.splash_background_url } : null
        };
      }

      // 2. Navigation
      const navRows = this.query<any>('SELECT * FROM navigation_labels ORDER BY sort_order ASC');
      if (navRows.length > 0) {
        settingsMap.navigation = navRows.map(row => ({
          nav_item_label: row.label,
          nav_image: row.icon_key ? { url: row.icon_key } : null,
          nav_link: row.nav_link_url ? { url: row.nav_link_url } : null,
          nav_order: row.sort_order
        }));
      }

      // 3. Popup Content
      const popupRows = this.query<any>('SELECT * FROM popup_content WHERE id = 1');
      if (popupRows.length > 0) {
        const row = popupRows[0];
        settingsMap.popup_content = {
          popup_enabled: row.popup_enabled === 1,
          popup_title: row.popup_title,
          popup_body_copy: row.popup_body_copy,
          popup_image: row.popup_image_url ? { url: row.popup_image_url } : null,
          cta_button_link: (function () {
            if (!row.cta_button_link) return null;
            try { return JSON.parse(row.cta_button_link); } catch (e) { return { url: row.cta_button_link }; }
          })(),
          close_button_style: row.close_button_style
        };
      }

      // 4. Home Screen Settings
      const hsRows = this.query<any>('SELECT * FROM home_screen_settings WHERE id = 1');
      if (hsRows.length > 0) {
        const row = hsRows[0];

        // Fetch home screen programs
        const limitPrograms = (row.programs_to_display !== undefined && row.programs_to_display !== null && !isNaN(parseInt(row.programs_to_display, 10)))
          ? parseInt(row.programs_to_display, 10)
          : 4;

        let homePrograms = this.query<any>(
          'SELECT * FROM programs WHERE active = 1 AND featured = 1 ORDER BY sort_order ASC LIMIT ?',
          [limitPrograms]
        ).map(p => ({
          id: p.id,
          program_name: p.program_name,
          thumbnail_image: p.thumbnail_image_url ? { url: p.thumbnail_image_url } : null,
          short_description: p.short_description,
          schedule_dates: p.schedule_dates
        }));

        if (homePrograms.length === 0 && limitPrograms > 0) {
          homePrograms = this.query<any>(
            'SELECT * FROM programs WHERE active = 1 ORDER BY sort_order ASC LIMIT ?',
            [limitPrograms]
          ).map(p => ({
            id: p.id,
            program_name: p.program_name,
            thumbnail_image: p.thumbnail_image_url ? { url: p.thumbnail_image_url } : null,
            short_description: p.short_description,
            schedule_dates: p.schedule_dates
          }));
        }

        // Fetch home screen trails
        const limitTrails = (row.trail_links_to_show !== undefined && row.trail_links_to_show !== null && !isNaN(parseInt(row.trail_links_to_show, 10)))
          ? parseInt(row.trail_links_to_show, 10)
          : 3;

        const homeTrails = this.query<any>(
          'SELECT * FROM trails WHERE active = 1 ORDER BY sort_order ASC LIMIT ?',
          [limitTrails]
        ).map(t => ({
          id: t.id,
          trail_name: t.trail_name,
          distance: t.distance
        }));

        // Fetch featured event (WordPress formats it as an array of objects)
        let featuredEvent = null;
        if (row.featured_event_id) {
          const evRows = this.query<any>('SELECT * FROM events WHERE id = ?', [row.featured_event_id]);
          if (evRows.length > 0) {
            const ev = evRows[0];
            featuredEvent = [{
              id: ev.id,
              event_name: ev.event_name,
              thumbnail_image: ev.thumbnail_image_url ? { url: ev.thumbnail_image_url } : null,
              short_description: ev.short_description,
              'start_date_&_time': ev.start_date_time,
              'end_date_&_time': ev.end_date_time,
              active: ev.active === 1
            }];
          }
        }

        settingsMap.home_screen = {
          hero_welcome_heading: row.hero_welcome_heading,
          hero_intro_paragraph: row.hero_intro_paragraph,
          hero_cta_button_link: (function () {
            if (!row.hero_cta_button_link) return null;
            try { return JSON.parse(row.hero_cta_button_link); } catch (e) { return { url: row.hero_cta_button_link }; }
          })(),
          map_block_heading: row.map_block_heading,
          map_view_button_label: row.map_view_button_label,
          programs_block_heading: row.programs_block_heading,
          programs_to_display: row.programs_to_display,
          programs: homePrograms,
          event_block_heading: row.event_block_heading,
          event_view_all_label: row.event_view_all_label,
          featured_event: featuredEvent,
          trails_block_heading: row.trails_block_heading,
          trail_links_to_show: row.trail_links_to_show,
          trails: homeTrails,
          sponsorship_information: {
            grant_logo: row.grant_logo_url ? { url: row.grant_logo_url } : null,
            grant_details: row.grant_details || null,
          }
        };
      }

      // 5. Plan Your Trip Settings
      const pytRows = this.query<any>('SELECT * FROM plan_your_trip_settings WHERE id = 1');
      if (pytRows.length > 0) {
        const row = pytRows[0];
        const sectionsRows = this.query<any>('SELECT * FROM plan_your_trip_sections ORDER BY sort_order ASC');
        const galleryRows = this.query<{ image_url: string }>('SELECT image_url FROM plan_your_trip_gallery');
        settingsMap.plan_your_trip = {
          screen_title: row.screen_title,
          hero_image: row.hero_image_url ? { url: row.hero_image_url } : null,
          image_gallery: galleryRows.map(g => ({ url: g.image_url })),
          intro_paragraph: row.intro_paragraph,
          content_sections: sectionsRows.map(sec => ({
            section_heading: sec.section_heading,
            section_icon: sec.section_icon_url ? { url: sec.section_icon_url } : null,
            section_body: sec.section_body,
            section_active: sec.section_active === 1,
            sort_order: sec.sort_order
          }))
        };
      }

      // 6. Visitors Center Settings
      const vcRows = this.query<any>('SELECT * FROM visitors_center_settings WHERE id = 1');
      if (vcRows.length > 0) {
        const row = vcRows[0];
        const galleryRows = this.query<{ image_url: string }>('SELECT image_url FROM visitor_gallery');
        let hoursParsed = null;
        try {
          hoursParsed = row.hours_of_operation ? JSON.parse(row.hours_of_operation) : null;
        } catch {
          hoursParsed = row.hours_of_operation;
        }

        settingsMap.visitors = {
          screen_title: row.screen_title,
          hero: row.hero_image_url ? { url: row.hero_image_url } : null,
          image_gallery: galleryRows.map(g => ({ url: g.image_url })),
          body_copy: row.body_copy,
          address: row.address,
          phone_number: row.phone_number,
          hours_of_operation: hoursParsed,
          accessibility_notes: row.accessibility_notes,
          cta_1_title: row.cta_1_title,
          cta_1_image: row.cta_1_image_url ? { url: row.cta_1_image_url } : null,
          cta_1_link: row.cta_1_link_url ? { title: row.cta_1_link_title, url: row.cta_1_link_url } : null,
          cta_2_title: row.cta_2_title,
          cta_2_image: row.cta_2_image_url ? { url: row.cta_2_image_url } : null,
          cta_2_link: row.cta_2_link_url ? { title: row.cta_2_link_title, url: row.cta_2_link_url } : null,
          map_poi_link: row.map_poi_link_id ? [{ ID: row.map_poi_link_id }] : null
        };
      }

      // 7. Programs Settings
      const psRows = this.query<any>('SELECT * FROM programs_settings WHERE id = 1');
      if (psRows.length > 0) {
        const row = psRows[0];
        settingsMap.programs_setting = {
          screen_title: row.screen_title,
          layout: row.layout,
          filter_bar_enabled: row.filter_bar_enabled === 1
        };
      }

      // 8. Events Settings
      const esRows = this.query<any>('SELECT * FROM events_settings WHERE id = 1');
      if (esRows.length > 0) {
        const row = esRows[0];
        settingsMap.event_settings = {
          screen_title: row.screen_title,
          past_events_visibility: row.past_events_visibility,
          filter_bar_enabled: row.filter_bar_enabled === 1
        };
      }

      // 9. Live Cam Settings
      const lcRows = this.query<any>('SELECT * FROM live_cam_settings WHERE id = 1');
      if (lcRows.length > 0) {
        const row = lcRows[0];
        settingsMap.live_cam_settings = {
          screen_title: row.screen_title,
          offline_message: row.offline_message,
          quality_note: row.quality_note
        };
      }

      // 10. Trail Settings
      const tsRows = this.query<any>('SELECT * FROM trail_settings WHERE id = 1');
      if (tsRows.length > 0) {
        const row = tsRows[0];
        settingsMap.trail_settings = {
          screen_title: row.screen_title,
          filter_bar_enabled: row.filter_bar_enabled === 1,
          default_sort: row.default_sort
        };
      }

      // 11. Rental Settings
      const rsRows = this.query<any>('SELECT * FROM rental_settings WHERE id = 1');
      if (rsRows.length > 0) {
        const row = rsRows[0];
        const galleryRows = this.query<{ image_url: string }>('SELECT image_url FROM rental_settings_gallery');
        settingsMap.rental_settings = {
          screen_title: row.screen_title,
          intro_text: row.intro_text,
          image_gallery: galleryRows.map(g => ({ url: g.image_url }))
        };
      }

      // 12. Tips Screen Settings
      const tssRows = this.query<any>('SELECT * FROM tips_screen_settings WHERE id = 1');
      if (tssRows.length > 0) {
        const row = tssRows[0];
        const galleryRows = this.query<{ image_url: string }>('SELECT image_url FROM tips_settings_gallery');
        settingsMap.tips_screen_settings = {
          screen_title: row.screen_title,
          intro_paragraph: row.intro_paragraph,
          header_icon: row.header_icon,
          image_gallery: galleryRows.map(g => ({ url: g.image_url }))
        };
      }

      // 13. Map Settings
      const msRows = this.query<any>('SELECT * FROM map_settings WHERE id = 1');
      if (msRows.length > 0) {
        const row = msRows[0];
        settingsMap.map_settings = {
          screen_title: row.screen_title,
          default_map_center: {
            lat: row.default_center_lat,
            lng: row.default_center_lng
          },
          default_zoom_level: row.default_zoom_level,
          map_style: row.map_style
        };
      }

    } catch (e) {
      console.error('Error fetching/reconstructing settings:', e);
    }

    return settingsMap;
  }
}
export const settingsRepository = new SettingsRepository();
