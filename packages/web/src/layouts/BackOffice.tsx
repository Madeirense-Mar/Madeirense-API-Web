import {
    useEffect
} from "react";

import {
    Outlet,
    useLocation,
    useParams
} from "react-router-dom";

import BackOfficePanel from "components/panels/BackOffice";
import SideMenu from "components/navigation/BackOffice/sideMenu";

import {
    BackOffice$Enumerators
} from "pages/BackOffice/utilities/enumerators";

import BookingPanel from "pages/BackOffice/panels/Booking";
import EventPanel from "pages/BackOffice/panels/Event";
import OrderPanel from "pages/BackOffice/panels/Order";
import ProductPanel from "pages/BackOffice/panels/Product";
import ResortPanel from "pages/BackOffice/panels/Resort";
import RestaurantPanel from "pages/BackOffice/panels/Restaurant";
import StaffPanel from "pages/BackOffice/panels/Staff";

import {
    Root$Enumerators
} from "styles/enumerators";

import "./BackOffice.css";

// ***************************************************************************************************************

const BackOfficeLayout = () => {
    const location = useLocation();

    const {
        id: _id
    } = useParams();

    const id = (!_id) ? undefined : parseInt(_id);

    const type = location.pathname.split("/")[2] as (keyof typeof BackOffice$Enumerators.Panels);

    useEffect(() => {
        const $root = document.getElementById("root");

        if (!$root) return;

        $root.setAttribute(
            Root$Enumerators.Attributes.Context.page,
            Root$Enumerators.Attributes.Pages["back-office"]
        );

        return () => {
            $root.removeAttribute(Root$Enumerators.Attributes.Context.page);
        }
    }, []);

    return <>
        <SideMenu />

        <Outlet />

        {(id) && <BackOfficePanel enabled>
            {(type === "bookings") && <BookingPanel {...{ id }} />}
            {(type === "deliveries") && <OrderPanel {...{ id }} />}
            {(type === "events") && <EventPanel {...{ id }} />}
            {(type === "products") && <ProductPanel {...{ id }} />}
            {(type === "requests") && <OrderPanel {...{ id }} />}
            {(type === "resorts") && <ResortPanel {...{ id }} />}
            {(type === "restaurants") && <RestaurantPanel {...{ id }} />}
            {(type === "staff") && <StaffPanel {...{ id }} />}
        </BackOfficePanel>}
    </>
};

export default BackOfficeLayout;