/**
 * Responsive Service
 * Auto-detects device type and provides adaptive rendering utilities
 */

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
}

class ResponsiveService {
    private currentDevice: DeviceInfo | null = null;
    private listeners: Set<(device: DeviceInfo) => void> = new Set();

    /**
     * Initialize responsive detection
     */
    init(): void {
        this.updateDeviceInfo();
        window.addEventListener('resize', () => this.updateDeviceInfo());
        console.log('✅ Responsive service initialized');
    }

    /**
     * Update device information
     */
    private updateDeviceInfo(): void {
        const device = this.detectDevice();

        if (this.currentDevice &&
            this.currentDevice.type === device.type &&
            this.currentDevice.screenSize === device.screenSize) {
            return; // No change
        }

        this.currentDevice = device;
        console.log(`📱 Device: ${device.type} (${device.screenSize}), ${device.width}x${device.height}`);

        // Notify listeners
        this.listeners.forEach(listener => listener(device));
    }

    /**
     * Detect current device
     */
    private detectDevice(): DeviceInfo {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        const isTouch = this.isWillTouchDevice();
        const memory = (navigator as any).deviceMemory || undefined;

        // Determine screen size
        let screenSize: ScreenSize;
        if (width < 480) screenSize = 'xs';
        else if (width < 768) screenSize = 'sm';
        else if (width < 1024) screenSize = 'md';
        else if (width < 1536) screenSize = 'lg';
        else screenSize = 'xl';

        // Determine device type
        let type: DeviceType;
        if (width < 768) {
            type = 'mobile';
        } else if (width < 1024) {
            type = 'tablet';
        } else {
            type = 'desktop';
        }

        return { type, screenSize, width, height, isTouch, dpr, memory };
    }

    /**
     * Check if device supports touch
     */
    private isWillTouchDevice(): boolean {
        return (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            (navigator as any).msMaxTouchPoints > 0
        );
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

    /**
     * Check if on mobile
     */
    isMobile(): boolean {
        return this.getDevice().type === 'mobile';
    }

    /**
     * Check if on tablet
     */
    isTablet(): boolean {
        return this.getDevice().type === 'tablet';
    }

    /**
     * Check if on desktop
     */
    isDesktop(): boolean {
        return this.getDevice().type === 'desktop';
    }

    /**
     * Get optimal items per page based on device
     */
    getOptimalPageSize(): number {
        const device = this.getDevice();

        if (device.type === 'mobile') return 5;
        if (device.type === 'tablet') return 8;
        return 12;
    }

    /**
     * Get optimal column count for grid layouts
     */
    getOptimalColumns(): number {
        const device = this.getDevice();

        if (device.type === 'mobile') return 1;
        if (device.type === 'tablet') return 2;
        return 3;
    }

    /**
     * Check if device has low memory (< 4GB)
     */
    hasLowMemory(): boolean {
        const device = this.getDevice();
        return device.memory ? device.memory < 4 : false;
    }

    /**
     * Get memory-aware batch size
     */
    getOptimalBatchSize(): number {
        const device = this.getDevice();

        if (this.hasLowMemory()) return 10;
        if (device.type === 'mobile') return 20;
        if (device.type === 'tablet') return 50;
        return 100;
    }

    /**
     * Get adaptive image quality
     */
    getImageQuality(): 'low' | 'medium' | 'high' {
        const device = this.getDevice();

        if (this.hasLowMemory()) return 'low';
        if (device.type === 'mobile') return 'medium';
        return 'high';
    }

    /**
     * Get optimal animation duration (ms)
     */
    getAnimationDuration(): number {
        // Reduce animations on mobile for better performance
        return this.isMobile() ? 200 : 300;
    }

    /**
     * Get breakpoint value for CSS
     */
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

    /**
     * Format dimensions for responsive display
     */
    formatDimensions(): string {
        const device = this.getDevice();
        return `${device.width}×${device.height}@${device.dpr}x`;
    }
}

export const responsiveService = new ResponsiveService();

// Auto-initialize
if (typeof window !== 'undefined') {
    responsiveService.init();
}
