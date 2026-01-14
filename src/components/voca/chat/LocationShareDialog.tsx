import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { MapPin, Navigation, Share2, Loader2, Locate } from 'lucide-react';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet Default Icon
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl,
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
});

interface LocationShareDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onShare: (location: { lat: number; lng: number; address?: string; name?: string }) => void;
}

// Component to recenter map when location changes
const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
};

// Component to handle map clicks
const LocationMarker = ({ position, setPosition }: { position: { lat: number, lng: number } | null, setPosition: (pos: { lat: number, lng: number }) => void }) => {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return position ? (
        <Marker position={position}>
            <Popup>Selected Location</Popup>
        </Marker>
    ) : null;
};

export const LocationShareDialog = ({ isOpen, onClose, onShare }: LocationShareDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Default to a central location (e.g., London) if no GPS, but don't show marker
    const defaultCenter = { lat: 51.505, lng: -0.09 };

    const handleGetLocation = () => {
        setLoading(true);
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const pos = { lat: latitude, lng: longitude };
                setCurrentLocation(pos);
                setSelectedLocation(pos); // Auto-select current location
                setLoading(false);
            },
            (error) => {
                console.error("Error getting location:", error);
                toast.error("Unable to retrieve your location");
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    // Auto-fetch on open if not set
    useEffect(() => {
        if (isOpen && !currentLocation) {
            handleGetLocation();
        }
    }, [isOpen]);

    const handleShare = () => {
        if (selectedLocation) {
            onShare({
                lat: selectedLocation.lat,
                lng: selectedLocation.lng,
                address: `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`,
                name: "Shared Location"
            });
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)] max-w-md p-0 overflow-hidden sm:rounded-2xl h-[500px] flex flex-col">
                <DialogHeader className="p-4 bg-[var(--wa-header-bg)] border-b border-[var(--wa-border)] shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[var(--wa-primary)]" />
                        Share Location
                    </DialogTitle>
                    <DialogDescription className="sr-only">Share your live or selected location</DialogDescription>
                </DialogHeader>

                <div className="flex-1 relative bg-slate-100 dark:bg-slate-800">
                    {/* Map Container */}
                    <MapContainer
                        center={currentLocation || defaultCenter}
                        zoom={13}
                        style={{ height: "100%", width: "100%", zIndex: 0 }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {currentLocation && <RecenterMap lat={currentLocation.lat} lng={currentLocation.lng} />}
                        <LocationMarker position={selectedLocation} setPosition={setSelectedLocation} />
                    </MapContainer>

                    {/* Loading Overlay */}
                    {loading && (
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-[1000] flex items-center justify-center">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 text-[var(--wa-primary)] animate-spin" />
                                <span className="text-sm font-medium">Locating...</span>
                            </div>
                        </div>
                    )}

                    {/* Floating Locate Button */}
                    <Button
                        size="icon"
                        variant="secondary"
                        className="absolute bottom-4 right-4 z-[400] rounded-full shadow-lg bg-white dark:bg-gray-800 text-[var(--wa-primary)] hover:bg-gray-100"
                        onClick={handleGetLocation}
                    >
                        <Locate className="w-5 h-5" />
                    </Button>
                </div>

                <div className="p-4 bg-[var(--wa-panel-bg)] border-t border-[var(--wa-border)] shrink-0 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-sm text-[var(--wa-text-secondary)] px-1">
                        <span>Selected: {selectedLocation ? `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}` : 'None'}</span>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1 text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] hover:bg-[var(--wa-hover)] rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleShare}
                            disabled={!selectedLocation}
                            className="flex-1 bg-[var(--wa-primary)] hover:bg-[var(--wa-primary)]/90 text-[var(--wa-inverse)] rounded-xl shadow-lg shadow-[var(--wa-primary)]/20"
                        >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share Live Location
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
