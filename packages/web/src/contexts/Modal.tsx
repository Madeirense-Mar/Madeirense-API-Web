//#region Imports -----------------------------------------
import { 
    createContext, 
    useContext, 
    useRef, 
    useState,
    type MouseEvent
} from "react";

import Button from "components/buttons";
import Icon from "components/icon";

import styles from "./Modal.module.css";
//#endregion

// ***************************************************************************************************************

//#region Interfaces and types ----------------------------
type modalOptions = {
    onClose: () => void,
    title: string
};

interface ModalContextType {
    eject: (callback?: Function) => void;
    show: (body: any, options?: Partial<modalOptions>) => void;
};
//#endregion

//#region Context declarations ----------------------------
const ModalContext = createContext<ModalContextType>({
    eject: (callback?: Function) => { },
    show: (body: any, options={}) => { }
});
//#endregion

const ModalProvider = ({ children }: any) => {
    //#region Hooks and state declarations ----------------
    const dialogRef = useRef<HTMLDialogElement | null>(null);

    const [body, setBody] = useState<any | null>(null);
    const [options, setOptions] = useState<Partial<modalOptions> | null>(null);
    //#endregion

    //#region Functions -----------------------------------
    const eject = (callback?: Function) => {
        dialogRef.current?.close();

        setBody(null);
        setOptions(null);

        callback?.();
    };

    const show = (body: any, options?: Partial<modalOptions>) => {
        dialogRef.current?.showModal();

        setBody(body);
        setOptions(options ?? null);
    };

    const handleClose = ({ target }: MouseEvent<HTMLButtonElement>) => {
        options?.onClose?.();

        eject();
    };
    //#endregion

    //#region DOM -----------------------------------------
    return <ModalContext.Provider value={{ eject, show }}>
        <dialog ref={dialogRef} className={styles.modal}>
            <header>
                {Boolean(options?.title) && <h2>{options?.title}</h2>}

                <Button id="eject" onClick={handleClose} data-shape="round" variant='secondary' className='ml-auto'>
                    <Icon name="Close" />
                </Button>
            </header>

            <main>{body}</main>
        </dialog>

        {children}
    </ModalContext.Provider>
    //#endregion
};

//#region Hooks -------------------------------------------
const useModal = () => {
    let context = useContext(ModalContext);

    if (!context) throw new Error(`'useModal' was used outside of its context.`);

    return context;
};
//#endregion

export { 
    ModalProvider, 
    useModal
};