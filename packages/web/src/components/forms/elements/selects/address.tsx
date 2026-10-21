import {
    useEffect,
    useId,
    useState,
    type ChangeEvent,
    type ComponentProps,
    type KeyboardEvent
} from "react";

import {
    Coordinates,
    resolveClassNames,
    searchAddresses,
    type boundingBoxType,
    type distanceVectorType,
    type geocodedPlaceType
} from "@Madeirense/shared";

import env from "env";

import Icon from "components/icon";

import styles from "./address.module.css";

// ***************************************************************************************************************

interface IPropTypes extends Omit<ComponentProps<"div">, "defaultValue"> {
    /** Results near this point rank higher. Defaults to central Luanda. */
    bias?: distanceVectorType;
    /** Results outside this box are excluded. Defaults to Angola. */
    boundingBox?: boundingBoxType;
    defaultValue?: string;
    disabled?: boolean;
    name?: string;
    onPick?: (place: geocodedPlaceType) => void;
    placeholder?: string;
    required?: boolean;
};

type searchStatusType = ("idle" | "loading" | "done" | "error");

/** Angola, Cabinda included: [minLng, minLat, maxLng, maxLat]. */
const ANGOLA_BOUNDING_BOX: boundingBoxType = [11.4, -18.1, 24.1, -4.3];

const LUANDA: distanceVectorType = {
    latitude: Coordinates.MiddleOfLuanda.LAT,
    longitude: Coordinates.MiddleOfLuanda.LNG
};

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 350;

/**
 * Address / place autocomplete backed by OpenStreetMap (Photon, see `env.GEOCODING_URL`).
 * Replaces the Google Places `Autocomplete`.
 */
function AddressSelect(_props: IPropTypes) {
    const {
        bias = LUANDA,
        boundingBox = ANGOLA_BOUNDING_BOX,
        className,
        defaultValue = "",
        disabled = false,
        name,
        onPick,
        placeholder = "Pesquisar endereço ou local...",
        required = false,
        ...props
    } = _props;

    const listId = useId();

    const [query, setQuery] = useState<string>(defaultValue);
    /** Text to search for; `null` while the input holds a picked result (or nothing worth searching). */
    const [searchTerm, setSearchTerm] = useState<string | null>(null);
    const [results, setResults] = useState<geocodedPlaceType[]>([]);
    const [status, setStatus] = useState<searchStatusType>("idle");
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [activeIndex, setActiveIndex] = useState<number>(-1);

    // Primitive dependencies so callers passing inline objects/arrays don't re-trigger the search.
    const { latitude: biasLatitude, longitude: biasLongitude } = bias;
    const boundingBoxKey = boundingBox.join(",");

    useEffect(() => {
        if (searchTerm === null) return;

        const controller = new AbortController();

        const timeout = window.setTimeout(() => {
            setStatus("loading");

            searchAddresses(searchTerm, {
                baseURL: env.GEOCODING_URL,
                bias: {
                    latitude: biasLatitude,
                    longitude: biasLongitude
                },
                boundingBox: boundingBoxKey.split(",").map(Number) as boundingBoxType,
                signal: controller.signal
            })
                .then((places) => {
                    setResults(places);
                    setActiveIndex(-1);
                    setStatus("done");
                })
                .catch((reason: unknown) => {
                    if (controller.signal.aborted) return;

                    console.error("Address search error:", reason);

                    setResults([]);
                    setStatus("error");
                });
        }, DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [searchTerm, biasLatitude, biasLongitude, boundingBoxKey]);

    function handleChange({ target }: ChangeEvent<HTMLInputElement>) {
        const { value } = target;

        setQuery(value);
        setIsOpen(true);

        if (value.trim().length >= MIN_QUERY_LENGTH) {
            setSearchTerm(value);

            return;
        }

        setSearchTerm(null);
        setResults([]);
        setStatus("idle");
    };

    function pick(place: geocodedPlaceType) {
        setQuery(place.address || place.name);
        setSearchTerm(null);
        setResults([]);
        setStatus("idle");
        setIsOpen(false);

        onPick?.(place);
    };

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        switch (event.key) {
            case "ArrowDown":
            case "ArrowUp": {
                if (results.length === 0) return;

                event.preventDefault();

                const step = (event.key === "ArrowDown") ? 1 : -1;

                setIsOpen(true);
                setActiveIndex(i => (i + step + results.length) % results.length);

                break;
            }

            case "Enter": {
                const place = results[activeIndex];

                if (!isOpen || !place) return;

                // Picking a suggestion must not submit the surrounding form.
                event.preventDefault();

                pick(place);

                break;
            }

            case "Escape": {
                setIsOpen(false);

                break;
            }

            default: break;
        }
    };

    const handleVisibility = (show: boolean = false) => (e: any) => setIsOpen(show);

    const assertions = {
        "showList": isOpen && (results.length > 0 || ["done", "error"].includes(status)),
    };

    const activeOptionId = (assertions.showList && activeIndex >= 0) ? `${listId}-${activeIndex}` : undefined;

    return <div className={resolveClassNames(styles.select, className)} {...props}>
        <div className={styles.field}>
            {(status === "loading")
                ? <Icon name="Loading" className="animate-spin" />
                : <Icon name="MapMarker" />
            }

            <input
                aria-activedescendant={activeOptionId}
                aria-autocomplete="list"
                aria-controls={listId}
                aria-expanded={assertions.showList}
                autoComplete="off"
                onBlur={handleVisibility()}
                onChange={handleChange}
                onFocus={handleVisibility(true)}
                onKeyDown={handleKeyDown}
                role="combobox"
                type="text"
                value={query}
                {...{
                    disabled,
                    name,
                    placeholder,
                    required
                }}
            />
        </div>

        {assertions.showList && <ul id={listId} role="listbox" className={styles.list}>
            {results.map((place, index) => <li
                aria-selected={index === activeIndex}
                id={`${listId}-${index}`}
                key={place.id}
                onClick={() => pick(place)}
                // Keep focus in the input so onBlur doesn't close the list before the click lands.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
            >
                <strong>{place.name}</strong>

                {(place.address !== place.name) && <small>{place.address}</small>}
            </li>)}

            {(status === "done" && results.length === 0) && <li data-state="empty">
                Nenhum resultado. Tente outro nome ou rua.
            </li>}

            {(status === "error") && <li data-state="error">
                <Icon name="ExclamationCircle" />

                Erro ao pesquisar endereços.
            </li>}
        </ul>}
    </div>
};

export default AddressSelect;
