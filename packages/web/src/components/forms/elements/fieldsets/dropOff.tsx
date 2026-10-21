import {
    useRef,
    useState,
    type ComponentProps
} from "react";

import {
    getAddressFromCoordinates,
    type distanceVectorType,
    type parsedAddressObjectType,
} from "@Madeirense/shared";

import env from "env";

import LeafletLocationPicker from "components/maps/leaflet/locationPicker";

import Icon from "components/icon";

// ***************************************************************************************************************

export namespace DropOffFieldset$Types {
    export type location = { latitude: number, longitude: number } & parsedAddressObjectType;
};

interface IPropTypes extends ComponentProps<"fieldset"> {
    DEBUG?: boolean;
    defaultName?: string;
    defaultSpecialInstructions?: string;
    hideLegend?: boolean;
    initialLocation?: distanceVectorType;
    legendLabel?: string;
    onLocationSelect?: (address: DropOffFieldset$Types.location) => void;
    presetName?: string;
    save?: boolean;
};

/** Used when the geocoder knows nothing near the picked point: the coordinates still identify it. */
const coordinatesAsAddress = ({ latitude, longitude }: distanceVectorType): parsedAddressObjectType => ({
    street_number: "",
    street_name: "",
    neighborhood: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
});

function DropOffFieldset(_props: IPropTypes) {
    const {
        DEBUG = false,
        defaultName = undefined,
        defaultSpecialInstructions = undefined,
        hideLegend = false,
        initialLocation,
        legendLabel = "Localização",
        onLocationSelect,
        presetName = undefined,
        save = false,
        ...props
    } = _props;

    const [address, setAddress] = useState<parsedAddressObjectType | null>(null);
    const [dropOffLocation, updateLocation] = useState<distanceVectorType | undefined>(initialLocation);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [showAddress, toggleShowAddress] = useState<boolean>((defaultName !== undefined) ? true : false);

    /** Aborts the previous lookup so a slow response can't overwrite a newer pick. */
    const lookupController = useRef<AbortController | null>(null);

    const handleLocationSelect = async (location: distanceVectorType) => {
        updateLocation(location);

        lookupController.current?.abort();

        const controller = new AbortController();

        lookupController.current = controller;

        try {
            setLoading(true);
            setError(null);

            const _address = await getAddressFromCoordinates(location, {
                baseURL: env.GEOCODING_URL,
                signal: controller.signal
            }) ?? coordinatesAsAddress(location);

            onLocationSelect?.({
                ..._address,
                ...location
            });

            setAddress(_address);
        } catch (error) {
            if (controller.signal.aborted) return;

            setError(error as Error);
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    };

    return <fieldset {...props}>
        {!hideLegend && <legend>{legendLabel}</legend>}

        <LeafletLocationPicker
            DEBUG={DEBUG}
            onLocationSelect={handleLocationSelect}
            initialLocation={dropOffLocation}
        />

        {!save && <label className='flex flex-row justify-start items-center gap-2'>
            <input type="checkbox" defaultChecked={defaultName !== undefined} name="save_dropoff_location" id="save_dropoff_location" onChange={({ target }) => toggleShowAddress(target.checked)} />

            Salvar endereço?
        </label>}

        {error && <div data-state="error" className='w-full p-3 flex flex-row justify-start items-center gap-2'>
            <Icon name="ExclamationCircle" />

            {error.message}
        </div>}

        {(save || showAddress) && <div className='flex flex-row justify-start items-start gap-2 w-full'>
            <label className='w-1/3'>
                {presetName === "Casa" && <Icon name="Home" className='inline-block mr-2' />}
                {presetName === "Trabalho" && <Icon name="Work" className='inline-block mr-2' />}

                <span>Nome</span>

                <br />

                <input defaultValue={defaultName ?? ""} type="text" name="delivery_location_name" id="delivery_location_name" className='w-full' placeholder='Casa, Trabalho...' required {...(presetName ? { readOnly: true, value: presetName } : {})} />
            </label>

            <label className='w-full'>
                <div className='flex flex-row justify-start items-center gap-2'>
                    <span>Endereço</span>

                    {loading && <Icon name="Loading" className="animate-spin" />}
                </div>

                <input type="text" name="delivery_location_address" id="delivery_location_address" className='w-full' readOnly placeholder='Preenchido automáticamente' value={address?.address ?? ""} />
            </label>
        </div>}

        <label htmlFor="delivery_special_instructions">Direções ou indicações? (Opcional)</label>

        <textarea defaultValue={defaultSpecialInstructions ?? ""} id="delivery_special_instructions" name="delivery_special_instructions" placeholder="Direções, ponto de referência, cuidados..." rows={2} className='w-full' />

        <input type="hidden" name="latitude" value={dropOffLocation?.latitude ?? 0} required />
        <input type="hidden" name="longitude" value={dropOffLocation?.longitude ?? 0} required />
    </fieldset>
};

export default DropOffFieldset;
