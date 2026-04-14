import useInterfaceSettingsStore from '../store/interfaceSettingsStore';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export const useLocation = () => {
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const locationSetting = useInterfaceSettingsStore((state) => state.optionsList['3']); //iface_allow_location

    useEffect(() => {
            let subscriber = null;

            const startWatching = async () => {
                if (locationSetting) {
                    try {
                        let { status } = await Location.requestForegroundPermissionsAsync();
                        if (status !== 'granted') {
                            setErrorMsg('Permission to access location was denied');
                            return;
                        }

                        subscriber = await Location.watchPositionAsync(
                            {
                                accuracy: Location.Accuracy.Balanced,
                                timeInterval: 15000, //15 seconds
                                distanceInterval: 15, //15 meters
                            },
                            (newLocation) => {
                                setLocation(newLocation);
                            }
                        );
                    } catch (error) {
                        console.error(error);
                        setErrorMsg('Error fetching location');
                    }
                }
            };

            startWatching();
            return () => {
                if (subscriber) {
                    subscriber.remove();
                }
            };
        }, [locationSetting]);

        return { location, errorMsg };
    };