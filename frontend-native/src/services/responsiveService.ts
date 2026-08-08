/**
 * Responsive Service (React Native)
 * Auto-detects device type and provides adaptive rendering utilities.
 * 
 * Ported from the web version — replaces `window`/`navigator` APIs
 * with React Native's Dimensions and Platform APIs.
 */

import { Dimensions, Platform } from 'react-native';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface DeviceInfo {
  type: DeviceType;
  screenSize: ScreenSize;
  width: number;
  height: number;
  isTouch: boolean;
  dpr: number;
  memory?: number;
  platform: string;
}

class ResponsiveService {
  private currentDevice: DeviceInfo | null = null;
  private listeners: Set<(device: DeviceInfo) => void> = new Set();

  /**
   * Initialize responsive detection
   */
  init(): void {
    this.updateDeviceInfo();
    // In RN, orientation changes are handled by Dimensions listener
    Dimensions.addEventListener('change', () => this.updateDeviceInfo());
    console.log('[responsive] Service initialized');
  }

  /**
   * Update device information
   */
  private updateDeviceInfo(): void {
    const device = this.detectDevice();

    if (
      this.currentDevice &&
      this.currentDevice.type === device.type &&
      this.currentDevice.screenSize === device.screenSize
    ) {
      return; // No change
    }

    this.currentDevice = device;
    console.log(
      `[responsive] Device: ${device.type} (${device.screenSize}), ${device.width}x${device.height}`,
    );

    // Notify listeners
    this.listeners.forEach((listener) => listener(device));
  }

  /**
   * Detect current device using React Native APIs
   */
  private detectDevice(): DeviceInfo {
    const { width, height, scale } = Dimensions.get('window');
    const dpr = scale;
    const platform = Platform.OS as string;
    const isTouch = platform !== 'web'; // mobile/desktop RN builds are touch-capable

    // Determine screen size
    let screenSize: ScreenSize;
    if (width < 480) screenSize = 'xs';
    else if (width < 768) screenSize = 'sm';
    else if (width < 1024) screenSize = 'md';
    else if (width < 1536) screenSize = 'lg';
    else screenSize = 'xl';

    // Determine device type
    let type: DeviceType;
    if (platform === 'web') {
      if (width < 768) type = 'mobile';
      else if (width < 1024) type = 'tablet';
      else type = 'desktop';
    } else {
      // Native: distinguish phone vs tablet by screen width
      if (width < 768) type = 'mobile';
      else type = 'tablet';
    }

    // memory not reliably available in RN without native module; leave undefined
    return { type, screenSize, width, height, isTouch, dpr, platform };
  }

  /**
   * Get current device info
   */
  getDevice(): DeviceInfo {
    if (!this.currentDevice) {
      this.updateDeviceInfo();
    }
    return this.currentDevice!;
  }

  /**
   * Subscribe to device changes
   */
  onChange(callback: (device: DeviceInfo) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  isMobile(): boolean {
    return this.getDevice().type === 'mobile';
  }

  isTablet(): boolean {
    return this.getDevice().type === 'tablet';
  }

  isDesktop(): boolean {
    return this.getDevice().type === 'desktop';
  }

  getOptimalPageSize(): number {
    const device = this.getDevice();
    if (device.type === 'mobile') return 5;
    if (device.type === 'tablet') return 8;
    return 12;
  }

  getOptimalColumns(): number {
    const device = this.getDevice();
    if (device.type === 'mobile') return 1;
    if (device.type === 'tablet') return 2;
    return 3;
  }

  hasLowMemory(): boolean {
    const device = this.getDevice();
    return device.memory ? device.memory < 4 : false;
  }

  getOptimalBatchSize(): number {
    const device = this.getDevice();
    if (this.hasLowMemory()) return 10;
    if (device.type === 'mobile') return 20;
    if (device.type === 'tablet') return 50;
    return 100;
  }

  getImageQuality(): 'low' | 'medium' | 'high' {
    const device = this.getDevice();
    if (this.hasLowMemory()) return 'low';
    if (device.type === 'mobile') return 'medium';
    return 'high';
  }

  getAnimationDuration(): number {
    return this.isMobile() ? 200 : 300;
  }

  getBreakpoint(): number {
    const device = this.getDevice();
    switch (device.screenSize) {
      case 'xs': return 0;
      case 'sm': return 480;
      case 'md': return 768;
      case 'lg': return 1024;
      case 'xl': return 1536;
    }
  }

  formatDimensions(): string {
    const device = this.getDevice();
    return `${device.width}×${device.height}@${device.dpr}x`;
  }
}
 

export const responsiveService = new ResponsiveService();

import { useState, useEffect } from 'react';

export interface ResponsiveState {
    isNarrow: boolean;
    isTablet: boolean;
    width: number;
    height: number;
}

export function useResponsive(): ResponsiveState {
    const [state, setState] = useState<ResponsiveState>(() => {
        const device = responsiveService.getDevice();
        return {
            isNarrow: device.width < 768,
            isTablet: device.type === 'tablet',
            width: device.width,
            height: device.height,
        };
    });

    useEffect(() => {
        const update = () => {
            const device = responsiveService.getDevice();
            setState({
                isNarrow: device.width < 768,
                isTablet: device.type === 'tablet',
                width: device.width,
                height: device.height,
            });
        };
        const sub = Dimensions.addEventListener('change', update);
        return () => sub.remove();
    }, []);

    return state;
}