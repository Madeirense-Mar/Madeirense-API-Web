import { IconBaseProps } from "react-icons";

import {
    AiFillGift,
    AiFillProduct,
    AiOutlineLoading3Quarters
} from "react-icons/ai";

import {
    BiFoodMenu,
    BiShapePolygon,
    BiSolidDrink,
    BiSolidHide,
    BiSolidLandscape,
    BiWater
} from "react-icons/bi";

import {
    BsPaypal,
    BsShieldLock
} from "react-icons/bs";

import {
    CgPassword
} from "react-icons/cg";

import {
    FaArrowDown,
    FaArrowLeft,
    FaArrowRight,
    FaArrowUp,
    FaCamera,
    FaCircle,
    FaCog,
    FaComment,
    FaExclamationCircle,
    FaFacebook,
    FaFilter,
    FaGoogle,
    FaHeart,
    FaHome,
    FaLock,
    FaMapMarkedAlt,
    FaMapMarkerAlt,
    FaMinus,
    FaPlus,
    FaRegCalendarTimes,
    FaRegCircle,
    FaRegDotCircle,
    FaRegTimesCircle,
    FaRegEye,
    FaRegEyeSlash,
    FaRegHeart,
    FaRegUserCircle,
    FaSave,
    FaSearch,
    FaShoppingCart,
    FaStar,
    FaStore,
    FaTrash,
    FaUpload,
    FaUser,
    FaUsers,
    FaUserShield,
    FaUserTie,
} from "react-icons/fa";

import {
    FaBowlRice,
    FaCashRegister,
    FaCreditCard,
    FaFacebookF,
    FaKitchenSet,
    FaLink,
    FaMoneyBillTransfer,
    FaRecycle,
    FaRegImage
} from "react-icons/fa6";

import {
    GiPartyPopper,
    GiSwipeCard,
    GiTakeMyMoney,
    GiWheat
} from "react-icons/gi";

import {
    GoChecklist,
    GoPlus
} from "react-icons/go";

import {
    GrEmptyCircle
} from "react-icons/gr";

import {
    HiMiniQueueList,
    HiPencil,
} from "react-icons/hi2";

import {
    IoIosLogOut,
    IoIosPricetags,
    IoIosWarning,
    IoMdAdd,
    IoMdClose,
} from "react-icons/io";

import {
    IoChatboxEllipsesOutline,
    IoChevronDownSharp,
    IoChevronUpSharp,
    IoDocumentTextOutline,
    IoFishSharp,
    IoHourglassOutline,
    IoNotifications,
    IoNotificationsOff,
    IoNotificationsCircleSharp,
    IoTicketSharp,
    IoSend
} from "react-icons/io5";

import {
    LiaUserPlusSolid
} from "react-icons/lia";

import {
    LuDessert,
    LuVegan
} from "react-icons/lu";

import {
    MdCheck,
    MdChevronLeft,
    MdChevronRight,
    MdCleaningServices,
    MdDarkMode,
    MdEmail,
    MdFilter,
    MdFoodBank,
    MdLightMode,
    MdLocalDrink,
    MdMyLocation,
    MdNavigation,
    MdNotificationsActive,
    MdOndemandVideo,
    MdOutlineAccessTime,
    MdOutlineFlashAuto,
    MdOutlineLogin,
    MdOutlineHistory,
    MdOutlineNoDrinks,
    MdOutlineNotes,
    MdOutlineReportGmailerrorred,
    MdOutlineTakeoutDining,
    MdOutlineWork,
    MdPendingActions,
    MdPhone,
    MdRotateLeft,
    MdRotateRight,
    MdRemoveShoppingCart,
    MdShapeLine,
    MdUpdate
} from "react-icons/md";

import {
    PiBookOpenText,
    PiBowlFoodFill,
    PiMoneyWavyFill,
    PiNewspaperClipping,
    PiSneakerMoveBold,
    PiTimerBold
} from "react-icons/pi";

import {
    RiCalendarTodoLine,
    RiCoupon2Line,
    RiDiscountPercentFill,
    RiLink,
    RiMegaphoneLine,
    RiTakeawayLine
} from "react-icons/ri";

import {
    RxDashboard
} from "react-icons/rx";

import {
    TbClock,
    TbClockOff,
    TbMapCancel,
    TbMapCheck,
    TbMapOff,
    TbMeat,
    TbPasswordMobilePhone,
    TbSalad,
    TbTicketOff,
    TbToolsKitchen
} from "react-icons/tb";

import env from "env";

// ***************************************************************************************************************

const registry = {
    //#region A --------------------------------------------
    Add: IoMdAdd,
    ArrowDown: FaArrowDown,
    ArrowLeft: FaArrowLeft,
    ArrowRight: FaArrowRight,
    ArrowUp: FaArrowUp,
    //#endregion

    //#region B --------------------------------------------
    BookOpenText: PiBookOpenText,
    BowlRice: FaBowlRice,
    //#endregion

    //#region C --------------------------------------------
    Calendar1: RiCalendarTodoLine,
    CalendarExpired: FaRegCalendarTimes,
    Camera: FaCamera,
    CashRegister: FaCashRegister,
    Chat: IoChatboxEllipsesOutline,
    CheckList: GoChecklist,
    Check: MdCheck,
    ChevronDown: IoChevronDownSharp,
    ChevronLeft: MdChevronLeft,
    ChevronRight: MdChevronRight,
    ChevronUp: IoChevronUpSharp,
    Circle: FaCircle,
    Clean: MdCleaningServices,
    Clock: TbClock,
    ClockOff: TbClockOff,
    Close: IoMdClose,
    Comments: FaComment,
    Coupon: RiCoupon2Line,
    CouponOff: TbTicketOff,
    CreditCard: FaCreditCard,
    //#endregion

    //#region D --------------------------------------------
    DarkMode: MdDarkMode,
    Dashboard: RxDashboard,
    Delivery: RiTakeawayLine,
    Dessert: LuDessert,
    Discount: RiDiscountPercentFill,
    Drink: MdLocalDrink,
    //#endregion

    //#region E --------------------------------------------
    Edit: HiPencil,
    Email: MdEmail,
    Empty: GrEmptyCircle,
    EmptyCart: MdRemoveShoppingCart,
    Error: MdOutlineReportGmailerrorred,
    Eye: FaRegEye,
    ExclamationCircle: FaExclamationCircle,
    EyeSlash: FaRegEyeSlash,
    //#endregion

    //#region F --------------------------------------------
    Facebook: FaFacebook,
    Facebook2: FaFacebookF,
    FishSharp: IoFishSharp,
    FlashAuto: MdOutlineFlashAuto,
    Filter: FaFilter,
    Food: PiBowlFoodFill,
    FoodMenu: BiFoodMenu,
    //#endregion

    //#region G --------------------------------------------
    Gift: AiFillGift,
    Google: FaGoogle,
    //#endregion

    //#region H --------------------------------------------
    HeartEmpty: FaRegHeart,
    HeartFilled: FaHeart,
    Hide: BiSolidHide,
    History: MdOutlineHistory,
    Home: FaHome,
    HourglassRunning: IoHourglassOutline,
    //#endregion

    //#region I --------------------------------------------
    Image: FaRegImage,
    ImageFilter: MdFilter,
    //#endregion

    //#region K --------------------------------------------
    Kitchen: TbToolsKitchen,
    KitchenSet: FaKitchenSet,
    //#endregion

    //#region L --------------------------------------------
    LightMode: MdLightMode,
    Link: RiLink,
    Link2: FaLink,
    Loading: AiOutlineLoading3Quarters,
    Lock: FaLock,
    Login: MdOutlineLogin,
    Logout: IoIosLogOut,
    //#endregion

    //#region M --------------------------------------------
    MapCancel: TbMapCancel,
    MapCheck: TbMapCheck,
    MapMarked: FaMapMarkedAlt,
    MapMarker: FaMapMarkerAlt,
    MapOff: TbMapOff,
    Meat: TbMeat,
    Megaphone: RiMegaphoneLine,
    Minus: FaMinus,
    MobileOTP: TbPasswordMobilePhone,
    Money: PiMoneyWavyFill,
    MoneyTransfer: FaMoneyBillTransfer,
    MyLocation: MdMyLocation,
    //#endregion

    //#region N --------------------------------------------
    Navigation: MdNavigation,
    NoDrinks: MdOutlineNoDrinks,
    Notes: MdOutlineNotes,
    Notification: IoNotifications,
    NotificationActive: MdNotificationsActive,
    NotificationOff: IoNotificationsOff,
    NotificationCircle: IoNotificationsCircleSharp,
    //#endregion

    //#region O --------------------------------------------
    Order: PiNewspaperClipping,
    OutlinedCircle: FaRegCircle,
    OutlinedDot: FaRegDotCircle,
    OutlinedTimes: FaRegTimesCircle,
    //#endregion

    //#region P -------------------------------------------- 
    Party: GiPartyPopper,
    Password: CgPassword,
    Paypal: BsPaypal,
    PendingActions: MdPendingActions,
    Phone: MdPhone,
    Plus: GoPlus,
    Plus2: FaPlus,
    PriceTags: IoIosPricetags,
    Product: AiFillProduct,
    ProductComposition: MdShapeLine,
    ProductType: BiShapePolygon,
    //#endregion

    //#region Q --------------------------------------------
    Queue: HiMiniQueueList,
    //#endregion

    //#region R --------------------------------------------
    Recycle: FaRecycle,
    Restaurant: MdFoodBank,
    RotateLeft: MdRotateLeft,
    RotateRight: MdRotateRight,
    Report: IoDocumentTextOutline,
    Running: PiSneakerMoveBold,
    //#endregion

    //#region S --------------------------------------------
    Salad: TbSalad,
    Save: FaSave,
    Search: FaSearch,
    Send: IoSend,
    Settings: FaCog,
    Shield: BsShieldLock,
    ShoppingCart: FaShoppingCart,
    SolidDrink: BiSolidDrink,
    Star: FaStar,
    Store: FaStore,
    SwipeCard: GiSwipeCard,
    //#endregion

    //#region T --------------------------------------------
    Takeout: MdOutlineTakeoutDining,
    TakeMyMoney: GiTakeMyMoney,
    ThemeLand: BiSolidLandscape,
    ThemeSea: BiWater,
    Ticket: IoTicketSharp,
    Time: MdOutlineAccessTime,
    Timer: PiTimerBold,
    Trash: FaTrash,
    //#endregion

    //#region U --------------------------------------------
    Update: MdUpdate,
    Upload: FaUpload,
    User: FaRegUserCircle,
    UserAdmin: FaUserTie,
    UserProtection: FaUserShield,
    UserRegistration: LiaUserPlusSolid,
    UserStaff: FaUser,
    Users: FaUsers,
    //#endregion

    //#region V --------------------------------------------
    Vegan: LuVegan,
    Video: MdOndemandVideo,
    //#endregion

    //#region W --------------------------------------------
    Warning: IoIosWarning,
    Wheat: GiWheat,
    Work: MdOutlineWork
    //#endregion
};

export type iconNameType = keyof (typeof registry);

interface IPropTypes extends Omit<IconBaseProps, "name"> {
    name: iconNameType;
};

const Icon = ({
    name,
    ...props
}: IPropTypes) => {
    const IconComponent = registry[name];

    if (IconComponent)
        return <IconComponent {...props} />;

    const notFoundMessage = `Icon with name "${name}" not found`;

    if (env.MODE === 'development') {
        console.warn(notFoundMessage)

        return null;
    }

    throw new Error(notFoundMessage);
};

export default Icon;