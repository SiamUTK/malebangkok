// File: frontend/src/utils/analytics.js
// Production-grade analytics utility for MaleBangkok
// Supports GA4 + Internal API + Privacy-first tracking

/**
 * Analytics Module
 * 
 * Purpose: Centralized event tracking for conversion optimization and AI learning
 * 
 * Features:
 * - GA4 event routing (automatic session/user_id handling)
 * - Internal API tracking (revenue, AI signals)
 * - Privacy-first: user IDs hashed, minimal PII
 * - Fail-safe: errors don't break app
 * - Environment-aware: respects REACT_APP_* variables
 * 
 * Usage:
 *   import { trackEvent, trackRevenue, trackPageView } from '@/utils/analytics';
 *   
 *   trackEvent('click_guide_card', { guide_id: 'G123' });
 *   trackRevenue({ booking_id: 'BK-789', price_total: 8025 });
 */

import axios from 'axios';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ANALYTICS_CONFIG = {
  GA4_ENABLED: typeof window !== 'undefined' && window.gtag !== undefined,
  INTERNAL_API_ENABLED: process.env.REACT_APP_ANALYTICS_API_ENABLED === 'true',
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  GA_ID: process.env.REACT_APP_GA_ID || '',
  DEBUG: process.env.NODE_ENV === 'development'
};

/**
 * Logging helper (only in development)
 */
const log = (message, data = null) => {
  if (ANALYTICS_CONFIG.DEBUG) {
    console.log(`[Analytics] ${message}`, data || '');
  }
};

/**
 * Error logging helper
 */
const logError = (message, error) => {
  console.warn(`[Analytics Error] ${message}`, error);
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Hash user ID for privacy (SHA256)
 * Used before sending any user identifiers to GA4 or internal APIs
 * 
 * @param {string} userId - Raw user ID
 * @returns {Promise<string>} SHA256 hash
 */
export const hashUserId = async (userId) => {
  try {
    // Use SubtleCrypto API (available in all modern browsers)
    const encoder = new TextEncoder();
    const data = encoder.encode(userId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    logError('Failed to hash user ID', error);
    // Return a fallback hash if SubtleCrypto not available
    return `HASH_${userId.substring(0, 8)}`;
  }
};

/**
 * Get the current session ID
 * GA4 automatically manages session_id - we use it for internal API
 * 
 * @returns {string} GA4 session ID or UUID fallback
 */
const getSessionId = () => {
  // GA4 automatically stores session ID in cookies
  // We can retrieve it from gtag if needed
  if (typeof window !== 'undefined' && window.gtag) {
    // This is a simplified approach - in production, you'd read from GA cookie
    const ga4Cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('_ga_'))
      ?.split('=')[1];
    
    if (ga4Cookie) return ga4Cookie;
  }
  
  // Fallback: generate UUID
  return `session_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get auth token from storage (for internal API calls)
 * 
 * @returns {string|null} JWT token
 */
const getAuthToken = () => {
  try {
    return localStorage.getItem('authToken') || null;
  } catch {
    return null;
  }
};

/**
 * Validate event data (prevent null/undefined from being sent)
 * 
 * @param {object} params - Event parameters
 * @returns {object} Cleaned parameters
 */
const sanitizeParams = (params) => {
  const sanitized = {};
  
  Object.entries(params).forEach(([key, value]) => {
    // Skip null, undefined, or empty strings
    if (value === null || value === undefined || value === '') {
      return;
    }
    
    // Convert booleans to strings for GA4
    if (typeof value === 'boolean') {
      sanitized[key] = String(value);
    }
    // Convert numbers to strings to avoid GA4 dimension/metric issues
    else if (typeof value === 'number') {
      sanitized[key] = String(value);
    }
    // Keep strings and objects as-is
    else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
};

// ============================================================================
// PRIMARY TRACKING FUNCTIONS
// ============================================================================

/**
 * Track custom event (generic handler)
 * 
 * Works with GA4 if gtag is loaded, silently fails otherwise
 * Use this for UI interactions, funnel events, engagement tracking
 * 
 * @param {string} eventName - Event name (snake_case, e.g., 'click_guide_card')
 * @param {object} params - Event parameters
 * @param {object} options - Additional options
 *   - sendToAPI (boolean): Send to internal API in addition to GA4
 *   - category (string): Event category for internal routing
 * 
 * @example
 *   trackEvent('click_guide_card', {
 *     guide_id: 'G123',
 *     guide_name: 'Ares',
 *     guide_rating: 4.8,
 *     card_position: 0
 *   });
 */
export const trackEvent = (eventName, params = {}, options = {}) => {
  try {
    const sanitized = sanitizeParams(params);
    
    // Add common context
    sanitized.session_id = getSessionId();
    sanitized.timestamp = Date.now();
    
    log(`Event: ${eventName}`, sanitized);
    
    // Send to GA4
    if (ANALYTICS_CONFIG.GA4_ENABLED) {
      window.gtag('event', eventName, sanitized);
    }
    
    // Optionally send to internal API
    if (options.sendToAPI && ANALYTICS_CONFIG.INTERNAL_API_ENABLED) {
      sendToInternalAPI('/analytics/events', {
        event_name: eventName,
        event_parameters: sanitized,
        event_category: options.category || 'general',
        timestamp: new Date().toISOString()
      });
    }
    
    return true;
  } catch (error) {
    logError(`Failed to track event: ${eventName}`, error);
    return false;
  }
};

/**
 * Track page view
 * 
 * Called when user navigates to a new page/section
 * GA4 auto-tracks pageviews, but we add custom props
 * 
 * @param {string} pageName - Page identifier (e.g., 'home', 'guide_profile', 'booking')
 * @param {object} properties - Page-level properties
 * 
 * @example
 *   trackPageView('guide_profile', {
 *     guide_id: 'G123',
 *     guide_name: 'Ares',
 *     guide_rating: 4.8
 *   });
 */
export const trackPageView = (pageName, properties = {}) => {
  try {
    const sanitized = sanitizeParams(properties);
    
    sanitized.page_name = pageName;
    sanitized.page_location = window.location.href ?? '';
    sanitized.page_title = document.title ?? '';
    sanitized.timestamp = Date.now();
    
    log(`PageView: ${pageName}`, sanitized);
    
    // GA4 pageview
    if (ANALYTICS_CONFIG.GA4_ENABLED) {
      window.gtag('config', ANALYTICS_CONFIG.GA_ID, {
        page_path: window.location.pathname,
        page_title: document.title,
        custom_map: {
          dimension1: 'page_name'
        }
      });
      
      window.gtag('event', 'page_view', sanitized);
    }
    
    return true;
  } catch (error) {
    logError(`Failed to track pageview: ${pageName}`, error);
    return false;
  }
};

/**
 * Track revenue event (CRITICAL - double-write to GA4 + Internal API)
 * 
 * Called when booking payment is confirmed
 * Must include: booking_id, guide_id, price_total
 * 
 * Sends to both GA4 (ecommerce) and Internal API (storage)
 * This is the most important event - don't lose these events
 * 
 * @param {object} bookingData - Booking information
 *   Required: booking_id, guide_id, price_total
 *   Optional: user_id, guide_name, guide_rating, user_type, etc.
 * 
 * @example
 *   trackRevenue({
 *     booking_id: 'BK-789',
 *     guide_id: 'G123',
 *     guide_name: 'Ares',
 *     guide_rating: 4.8,
 *     user_id: 'USER456',
 *     price_base: 7500,
 *     tax_amount: 525,
 *     price_total: 8025,
 *     session_date: '2026-02-25',
 *     session_time: '15:00',
 *     user_type: 'new'
 *   });
 */
export const trackRevenue = async (bookingData) => {
  try {
    // Validate required fields
    if (!bookingData.booking_id || !bookingData.guide_id || !bookingData.price_total) {
      throw new Error('Missing required: booking_id, guide_id, or price_total');
    }
    
    // Hash user ID if provided
    let userIdHashed = null;
    if (bookingData.user_id) {
      userIdHashed = await hashUserId(bookingData.user_id);
    }
    
    log('Revenue Event:', bookingData);
    
    // 1. Send to GA4 (ecommerce-compatible structure)
    if (ANALYTICS_CONFIG.GA4_ENABLED) {
      window.gtag('event', 'purchase', {
        transaction_id: bookingData.booking_id,
        affiliation: 'malebangkok_platform',
        value: String(bookingData.price_total),
        currency: 'THB',
        tax: String(bookingData.tax_amount || 0),
        items: [{
          item_id: bookingData.guide_id,
          item_name: bookingData.guide_name || 'Guide',
          item_category: 'premium_guide',
          price: String(bookingData.price_base || bookingData.price_total),
          quantity: '1'
        }],
        user_id: userIdHashed,
        guide_rating: String(bookingData.guide_rating || 0),
        guide_verified: String(bookingData.guide_verified || false),
        user_type: bookingData.user_type || 'unknown'
      });
    }
    
    // 2. Send to Internal API (async, non-blocking)
    if (ANALYTICS_CONFIG.INTERNAL_API_ENABLED && userIdHashed) {
      const internalPayload = {
        booking_id: bookingData.booking_id,
        guide_id: bookingData.guide_id,
        user_id_hashed: userIdHashed,
        price_base: bookingData.price_base || bookingData.price_total,
        tax_amount: bookingData.tax_amount || 0,
        price_total: bookingData.price_total,
        currency: 'THB',
        session_date: bookingData.session_date || new Date().toISOString().split('T')[0],
        session_time: bookingData.session_time || '00:00',
        guide_name: bookingData.guide_name || '',
        guide_rating_avg: bookingData.guide_rating || 0,
        guide_verified: bookingData.guide_verified || false,
        user_type: bookingData.user_type || 'new',
        created_at: new Date().toISOString()
      };
      
      // Fire and forget - don't await or reject
      sendToInternalAPI('/analytics/revenue', internalPayload)
        .catch(error => logError('Internal API revenue logging failed', error));
    }
    
    return true;
  } catch (error) {
    logError('Revenue tracking failed', error);
    // Don't throw - allow booking to complete even if tracking fails
    return false;
  }
};

/**
 * Track AI learning signal
 * 
 * Events that help improve the guide matching algorithm
 * Only sent to internal API (not GA4)
 * 
 * Examples:
 * - User clicked which guides (helps rank popular ones)
 * - How long user spent on profile (engagement signal)
 * - User abandoned after viewing profile (quality signal)
 * - Price filter used (pricing sensitivity)
 * 
 * @param {string} signalType - Type of signal (e.g., 'guide_clicked', 'profile_time_spent')
 * @param {object} signalData - Signal parameters
 * 
 * @example
 *   trackAISignal('guide_clicked', {
 *     guide_id: 'G123',
 *     guide_rating: 4.8,
 *     guide_verified: true,
 *     card_position: 3,
 *     timestamp: Date.now()
 *   });
 */
export const trackAISignal = (signalType, signalData = {}) => {
  try {
    const sanitized = sanitizeParams(signalData);
    
    sanitized.signal_type = signalType;
    sanitized.timestamp = Date.now();
    
    log(`AI Signal: ${signalType}`, sanitized);
    
    // Only send to internal API - don't pollute GA4
    if (ANALYTICS_CONFIG.INTERNAL_API_ENABLED) {
      sendToInternalAPI('/analytics/ai-signals', {
        signal_type: signalType,
        signal_data: sanitized,
        created_at: new Date().toISOString()
      });
    }
    
    return true;
  } catch (error) {
    logError(`Failed to track AI signal: ${signalType}`, error);
    return false;
  }
};

/**
 * Track form abandonment
 * 
 * Called when user leaves a form without completing/submitting
 * Helps identify friction points in booking flow
 * 
 * @param {string} formType - Form identifier (e.g., 'booking_form', 'register_form')
 * @param {object} context - Form context
 *   - lastStepCompleted (string): Which field was last filled
 *   - fieldsCompleted (number): How many fields filled
 *   - timeSpent (number): Milliseconds in form
 *   - formVersion (string): A/B test variant
 * 
 * @example
 *   trackFormAbandon('booking_form', {
 *     guide_id: 'G123',
 *     lastStepCompleted: 'email_field',
 *     fieldsCompleted: 2,
 *     timeSpent: 180000,
 *     formVersion: 'v2_5fields'
 *   });
 */
export const trackFormAbandon = (formType, context = {}) => {
  try {
    const sanitized = sanitizeParams(context);
    
    sanitized.form_type = formType;
    sanitized.form_completion_percent = context.fieldsCompleted ? 
      Math.round((context.fieldsCompleted / 5) * 100) : 0;
    
    log(`Form Abandoned: ${formType}`, sanitized);
    
    // Send to GA4 for funnel analysis
    if (ANALYTICS_CONFIG.GA4_ENABLED) {
      window.gtag('event', 'form_abandoned', sanitized);
    }
    
    // Send to internal API for detailed analysis
    if (ANALYTICS_CONFIG.INTERNAL_API_ENABLED) {
      sendToInternalAPI('/analytics/form-abandons', {
        form_type: formType,
        context: sanitized,
        timestamp: new Date().toISOString()
      });
    }
    
    return true;
  } catch (error) {
    logError(`Failed to track form abandon: ${formType}`, error);
    return false;
  }
};

// ============================================================================
// INTERNAL API HELPER
// ============================================================================

/**
 * Send data to internal analytics API
 * 
 * Wrapper around axios for internal API calls
 * Automatically includes auth token and error handling
 * 
 * @private
 * @param {string} endpoint - API endpoint (e.g., '/analytics/revenue')
 * @param {object} payload - Data to send
 * @returns {Promise<boolean>} Success indicator
 */
const sendToInternalAPI = async (endpoint, payload) => {
  try {
    const authToken = getAuthToken();
    
    const config = {
      method: 'post',
      url: `${ANALYTICS_CONFIG.API_BASE_URL}${endpoint}`,
      data: payload,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    };
    
    // Add auth header if token available
    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await axios(config);
    
    if (response.status === 200 || response.status === 201) {
      log(`API Success (${endpoint})`, response.data);
      return true;
    }
    
    logError(`API non-2xx response (${endpoint})`, response.status);
    return false;
  } catch (error) {
    // Silently fail for API errors - don't disrupt user experience
    if (error.response?.status === 401) {
      logError('Analytics API auth failed', error);
    } else if (error.code === 'ECONNABORTED') {
      log('Analytics API timeout - continuing');
    } else {
      logError(`API call failed (${endpoint})`, error.message);
    }
    return false;
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize analytics
 * 
 * Called once on app startup
 * Sets up GA4 gtag global, initializes session tracking
 * 
 * @param {string} gaId - GA4 property ID (e.g., 'G-XXXXXXXXXX')
 */
export const initializeAnalytics = (gaId) => {
  try {
    // Update config with provided GA ID
    if (gaId) {
      ANALYTICS_CONFIG.GA_ID = gaId;
    }
    
    // Check if gtag is available (would be loaded via Google Tag Manager script)
    if (typeof window !== 'undefined' && window.gtag) {
      ANALYTICS_CONFIG.GA4_ENABLED = true;
      log('Analytics initialized with GA4');
    } else {
      log('Warning: GA4 gtag not found - make sure Google Tag Manager script is loaded');
    }
    
    log('Analytics configuration:', ANALYTICS_CONFIG);
    
    return true;
  } catch (error) {
    logError('Failed to initialize analytics', error);
    return false;
  }
};

// ============================================================================
// EXPORTS (for convenience imports)
// ============================================================================

export default {
  trackEvent,
  trackPageView,
  trackRevenue,
  trackAISignal,
  trackFormAbandon,
  hashUserId,
  initializeAnalytics
};
