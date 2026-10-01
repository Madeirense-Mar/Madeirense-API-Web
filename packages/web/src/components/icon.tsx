import { IconBaseProps } from "react-icons";

import {
    AiFillGift,
    AiFillProduct,
    AiOutlineLoading3Quarters
} from "react-icons/ai";

import {
    BiFoodMenu,
    BiSolidDrink,
    BiSolidHide
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
    LiaUserPlusSolid
} from "react-icons/lia";

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
    IoIosWarning,
    IoMdAdd,
    IoMdClose,
} from "react-icons/io";

import {
    IoChatboxEllipsesOutline,
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
    MdUpdate
} from "react-icons/md";

import {
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
    TbMapCheck,
    TbMapCancel,
    TbMapOff,
    TbMeat,
    TbPasswordMobilePhone,
    TbSalad,
    TbToolsKitchen,
} from "react-icons/tb";

import env from "env";

// ***************************************************************************************************************

const registry = {
    Add: IoMdAdd,
    ArrowDown: FaArrowDown,
    ArrowLeft: FaArrowLeft,
    ArrowRight: FaArrowRight,
    ArrowUp: FaArrowUp,
    BowlRice: FaBowlRice,
    Calendar1: RiCalendarTodoLine,
    CalendarExpired: FaRegCalendarTimes,
    Camera: FaCamera,
    CashRegister: FaCashRegister,
    Chat: IoChatboxEllipsesOutline,
    CheckList: GoChecklist,
    Check: MdCheck,
    ChevronLeft: MdChevronLeft,
    ChevronRight: MdChevronRight,
    Circle: FaCircle,
    Clean: MdCleaningServices,
    Close: IoMdClose,
    Comments: FaComment,
    Coupon: RiCoupon2Line,
    CreditCard: FaCreditCard,
    DarkMode: MdDarkMode,
    Dashboard: RxDashboard,
    Delivery: RiTakeawayLine,
    Dessert: LuDessert,
    Discount: RiDiscountPercentFill,
    Drink: MdLocalDrink,
    Edit: HiPencil,
    Email: MdEmail,
    Empty: GrEmptyCircle,
    Error: MdOutlineReportGmailerrorred,
    Eye: FaRegEye,
    ExclamationCircle: FaExclamationCircle,
    EyeSlash: FaRegEyeSlash,
    Facebook: FaFacebook,
    Facebook2: FaFacebookF,
    FishSharp: IoFishSharp,
    FlashAuto: MdOutlineFlashAuto,
    Filter: FaFilter,
    Food: PiBowlFoodFill,
    FoodMenu: BiFoodMenu,
    Gift: AiFillGift,
    Google: FaGoogle,
    TakeMyMoney: GiTakeMyMoney,
    HeartEmpty: FaRegHeart,
    HeartFilled: FaHeart,
    Hide: BiSolidHide,
    History: MdOutlineHistory,
    Home: FaHome,
    HourglassRunning: IoHourglassOutline,
    Image: FaRegImage,
    ImageFilter: MdFilter,
    Kitchen: TbToolsKitchen,
    KitchenSet: FaKitchenSet,
    LightMode: MdLightMode,
    Link: RiLink,
    Link2: FaLink,
    Loading: AiOutlineLoading3Quarters,
    Lock: FaLock,
    Login: MdOutlineLogin,
    Logout: IoIosLogOut,
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
    NoDrinks: MdOutlineNoDrinks,
    Notes: MdOutlineNotes,
    Notification: IoNotifications,
    NotificationActive: MdNotificationsActive,
    NotificationOff: IoNotificationsOff,
    NotificationCircle: IoNotificationsCircleSharp,
    Order: PiNewspaperClipping,
    OutlinedCircle: FaRegCircle,
    OutlinedDot: FaRegDotCircle,
    OutlinedTimes: FaRegTimesCircle,
    Party: GiPartyPopper,
    Password: CgPassword,
    Paypal: BsPaypal,
    PendingActions: MdPendingActions,
    Phone: MdPhone,
    Plus: GoPlus,
    Plus2: FaPlus,
    Product: AiFillProduct,
    Queue: HiMiniQueueList,
    Recycle: FaRecycle,
    Restaurant: MdFoodBank,
    Report: IoDocumentTextOutline,
    Running: PiSneakerMoveBold,
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
    Takeout: MdOutlineTakeoutDining,
    Ticket: IoTicketSharp,
    Time: MdOutlineAccessTime,
    Timer: PiTimerBold,
    Trash: FaTrash,
    Update: MdUpdate,
    Upload: FaUpload,
    User: FaRegUserCircle,
    UserAdmin: FaUserTie,
    UserProtection: FaUserShield,
    UserRegistration: LiaUserPlusSolid,
    UserStaff: FaUser,
    Users: FaUsers,
    Vegan: LuVegan, 
    Video: MdOndemandVideo,
    Warning: IoIosWarning,
    Wheat: GiWheat,
    Work: MdOutlineWork
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

    if (!IconComponent) {
        const notFoundMessage = `Icon with name "${name}" not found`;

        if (env.MODE === 'development') {
            console.warn(notFoundMessage)

            return null;
        } else {
            throw new Error(notFoundMessage);
        }
    };

    return <IconComponent {...props} />;
};

export default Icon;