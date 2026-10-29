import {
	JSX,
	type ReactElement
} from "react";

import {
	BrowserRouter,
	Outlet,
	Routes,
	Route
} from "react-router-dom";

import {
	USER_ROLES,
	Madeirense$Enumerators,
} from "@Madeirense/shared";

import {
	Page$Enumerators
} from "pages/enumerators";

import {
	useProfile
} from "contexts/Profile";

import Layout from "layouts/Layout";

import NotFoundPage from "pages/404";

import EventsPage from "pages/Events";
import HomePage from "pages/Home";
import OfflinePage from "pages/Offline";
import OrderPage from "pages/Order";
import ProductPage from "pages/Product";
import ProfilePage from "pages/Profile";
import ResortPage from "pages/Resort";
import SetCredentialsPage from "pages/SetCredentials";
import WelcomePage from "pages/Welcome";

import AuthenticationSuccessPage from "pages/Authentication/success";

import BackOfficeLayout from "layouts/BackOffice";
import BackOfficeBookingsPage from "pages/BackOffice/Bookings";
import BackOfficeDashboardPage from "pages/BackOffice";
import BackOfficeDeliveriesPage from "pages/BackOffice/Deliveries";
import BackOfficeOrdersPage from "pages/BackOffice/Orders";
import BackOfficeProductsPage from "pages/BackOffice/Products";
import BackOfficeResortsPage from "pages/BackOffice/Resorts";
import BackOfficeRestaurantPage from "pages/BackOffice/Restaurant";
import BackOfficeSettingsPage from "pages/BackOffice/Settings";
import BackOfficeStaffPage from "pages/BackOffice/Staff";

import CheckoutLayout from "layouts/Checkout";
import CheckoutEventsPage from "pages/Checkout/Events";
import CheckoutProductsPage from "pages/Checkout/Products";
import CheckoutResortPage from "pages/Checkout/Resort";

import LegalLayout from "layouts/Legal";
import LegalPrivacyPolicyPage from "pages/Legal/Policy";
import LegalTermsAndConditionsPage from "pages/Legal/Terms";

import type {
	$Enums
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

interface IRoute {
	id: string;
	label?: string;
	path?: string;
	element?: JSX.Element;
	icon?: ReactElement;
	userRoles?: ReadonlyArray<keyof typeof $Enums.Users_user_role>
};

interface IAppRouteBranch extends IRoute {
	index?: boolean;
};

interface IAppRoute extends IRoute {
	branches?: ReadonlyArray<IAppRouteBranch>;
	routes?: ReadonlyArray<IAppRoute>;
	userRoles?: ReadonlyArray<keyof typeof $Enums.Users_user_role>;
	toNavigationLink?: (this: IAppRoute, userRole?: keyof typeof $Enums.Users_user_role) => Readonly<navLinkType>
	toNavigationLinks?: (this: IAppRoute, userRole?: keyof typeof $Enums.Users_user_role) => ReadonlyArray<navLinkType>
};

type navLinkType = {
	id: string,
	link: string,
	label: string,
	icon?: ReactElement
};

const hiddenPaths = [
	"403",
	"error",
];

/**
 * Transforms each {@link IAppRoute | `route`} and {@link IAppRoute | `branch`} (if any are present), into a {@link navLinkType | navigation link object.}
 * 
 * For each child node under the main `route` tree branch, the base {@link IRoute.path | `path`} is joined with child's path using `/` as a separator.
 * @returns {navLinkType[]}
 */
function toNavigationLinks(this: IAppRoute, userRole?: keyof typeof $Enums.Users_user_role): ReadonlyArray<navLinkType> {
	const {
		branches = [],
		path,
		routes = [],
	} = this;

	return [
		...branches,
		...routes
	]
		.filter(({ userRoles = USER_ROLES }) => (!userRole) ? true : userRoles.includes(userRole))
		.filter(({ path }) => !hiddenPaths.includes(path ?? ""))
		.map(branch => ({
			id: branch.id,
			icon: branch.icon,
			label: branch.label || "",
			link: [
				(path === "/") ? "" : path,
				branch.path || ""
			].join("/"),
		}));
};

/**
 * Transforms the current {@link IAppRoute | `route`}, into a {@link navLinkType | navigation link object.}
 * 
 * @returns {navLinkType}
 */
function toNavigationLink(this: IAppRoute, userRole?: keyof typeof $Enums.Users_user_role): Readonly<navLinkType> {
	return {
		id: this.id,
		icon: this.icon,
		label: this.label || "",
		link: this.path || "#",
	}
};

/**
 * # Route tree
 * 
 * This is the app's routing tree, it contains the paths for every rendered page.
 * 
 * It contains an array of `routes` and `branches`, where:
 * - Both render a {@link Route | `<Route />`} element.
 * - A {@link IAppRoute | `route`} is the top-most member of a tree branch, rendering sub-pages (often through an {@link Outlet | `<Outlet />`}) or just a single page.
 * - A {@link IAppRouteBranch | branch} is a unit or a sub-page rendered by a `route`.
 * - A `route` can have `branches` and sub-routes.
 * - Each `route` can render {@link toNavigationLinks | its own array of links} containing paths for every immediate descendant.
 * 
*/
const appRoutesTree: ReadonlyArray<IAppRoute> = [
	{
		id: "main",
		path: Madeirense$Enumerators.Pages.App.Layout,
		label: "aplicação",
		element: <Layout />,
		branches: [
			{
				id: "home",
				index: true,
				element: <HomePage />
			},
			{
				id: "offline",
				path: Madeirense$Enumerators.Pages.App.Offline,
				label: "Offline",
				element: <OfflinePage />
			},
			{
				id: "user-profile",
				path: Madeirense$Enumerators.Pages.App.Profile,
				label: "OAuth callback",
				element: <ProfilePage />,
			},
			{
				id: "successful-authentication",
				path: Madeirense$Enumerators.Pages.Authentication.Success,
				label: "OAuth callback",
				element: <AuthenticationSuccessPage />,
			},
			{
				id: "authentication-set-credentials",
				path: Madeirense$Enumerators.Pages.Authentication["Set Credentials"],
				label: "Definir credenciais",
				element: <SetCredentialsPage />,
			},
			{
				id: "events",
				path: `${Madeirense$Enumerators.Pages.App.Events}/:event_id?`,
				label: "events",
				element: <EventsPage />,
			},
			{
				id: "orders",
				path: `${Madeirense$Enumerators.Pages.App.Order}/:order_id?`,
				label: "Meus pedidos",
				element: <OrderPage />,
			},
			{
				id: "product",
				path: `${Madeirense$Enumerators.Pages.App.Product}/:product_id`,
				label: "Perfil do producto",
				element: <ProductPage />,
			},
			{
				id: "resort",
				path: Madeirense$Enumerators.Pages.App.Resort,
				label: "Resort madeirense",
				element: <ResortPage />,
			},
			{
				id: "welcome",
				path: `${Madeirense$Enumerators.Pages.App.Welcome}/:${Page$Enumerators.Parameters.type}`,
				label: "Bem-vindo",
				element: <WelcomePage />,
			},
		],
		routes: [
			{
				id: "back-office",
				path: Madeirense$Enumerators.Pages.BackOffice.Layout,
				label: "back-office",
				element: <BackOfficeLayout />,
				userRoles: [
					"Admin",
					"Driver",
					"Staff"
				],
				branches: [
					{
						id: "back-office-dashboard",
						path: Madeirense$Enumerators.Pages.BackOffice.Layout,
						label: "dashboard",
						element: <BackOfficeDashboardPage />,
						userRoles: [
							"Admin",
							"Staff"
						]
					},
					{
						id: "back-office-deliveries",
						path: `${Madeirense$Enumerators.Pages.BackOffice.Deliveries}/:id?`,
						label: "deliveries",
						element: <BackOfficeDeliveriesPage />,
					},
					{
						id: "back-office-products",
						path: `${Madeirense$Enumerators.Pages.BackOffice.Products}/:id?`,
						label: "products",
						element: <BackOfficeProductsPage />,
						userRoles: [
							"Admin",
							"Staff"
						]
					},
					{
						id: "back-office-requests",
						path: `${Madeirense$Enumerators.Pages.BackOffice.Requests}/:id?`,
						label: "requests",
						element: <BackOfficeOrdersPage />,
						userRoles: [
							"Admin",
							"Staff"
						]
					},
					{
						id: "back-office-resorts",
						path: `${Madeirense$Enumerators.Pages.BackOffice.Resort}/:id?`,
						label: "resorts",
						element: <BackOfficeBookingsPage />,
						userRoles: [
							"Admin",
							"Staff"
						]
					},
					{
						id: "back-office-resorts-bookings",
						path: `${Madeirense$Enumerators.Pages.BackOffice.Bookings}/:id?`,
						label: "resorts-bookings",
						element: <BackOfficeResortsPage />,
						userRoles: [
							"Admin",
							"Staff"
						]
					},
					{
						id: "back-office-restaurants",
						path: `${Madeirense$Enumerators.Pages.BackOffice.Restaurant}/:id?`,
						label: "restaurants",
						element: <BackOfficeRestaurantPage />,
						userRoles: [
							"Admin",
							"Staff"
						]
					},
					{
						id: "back-office-restaurant-events",
						path: `${Madeirense$Enumerators.Pages.BackOffice.RestaurantEvent}/:id?`,
						label: "events",
						element: <BackOfficeRestaurantPage />,
						userRoles: [
							"Admin",
							"Staff"
						]
					},
					{
						id: "back-office-staff",
						path: `${Madeirense$Enumerators.Pages.BackOffice.Staff}/:id?`,
						label: "staff",
						element: <BackOfficeStaffPage />,
						userRoles: [
							"Admin",
							"Staff"
						]
					},
					{
						id: "back-office-settings",
						path: Madeirense$Enumerators.Pages.BackOffice.Settings,
						label: "settings",
						element: <BackOfficeSettingsPage />,
						userRoles: [
							"Admin"
						]
					},
				]
			},
			{
				id: "checkout",
				path: Madeirense$Enumerators.Pages.Checkout.Layout,
				label: "checkout",
				element: <CheckoutLayout />,
				branches: [
					{
						id: "checkout-events",
						path: Madeirense$Enumerators.Pages.Checkout.Events,
						label: "events",
						element: <CheckoutEventsPage />,
					},
					{
						id: "checkout-products",
						path: Madeirense$Enumerators.Pages.Checkout.Products,
						label: "products",
						element: <CheckoutProductsPage />,
					},
					{
						id: "checkout-resort",
						path: Madeirense$Enumerators.Pages.Checkout.Resort,
						label: "products",
						element: <CheckoutResortPage />
					},
				]
			},
			{
				id: "legal",
				path: Madeirense$Enumerators.Pages.Legal.Layout,
				label: "Legal",
				element: <LegalLayout />,
				branches: [
					{
						id: "legal-privacy-policy",
						path: Madeirense$Enumerators.Pages.Legal.Policy,
						label: "Polícita de privacidade",
						element: <LegalPrivacyPolicyPage />
					},
					{
						id: "legal-terms-and-conditions",
						path: Madeirense$Enumerators.Pages.Legal.Terms,
						label: "Termos e condições",
						element: <LegalTermsAndConditionsPage />
					},
				]
			}
		],
		toNavigationLink,
		toNavigationLinks
	},
	{
		id: "404",
		path: "*",
		label: "Recurso não encontrado",
		element: <NotFoundPage />,
		toNavigationLink,
		toNavigationLinks
	}
];

function renderRoutes(
	routes: ReadonlyArray<IAppRoute>,
	userRole?: keyof typeof $Enums.Users_user_role
) {
	return routes
		.filter(({ userRoles = USER_ROLES }) => (!userRole) ? true : userRoles.includes(userRole))
		.map(route => <Route key={route.id} path={route.path} element={route.element}>
			{(route.branches || [])
				.filter(({ userRoles = USER_ROLES }) => (!userRole) ? true : userRoles.includes(userRole))
				.map(branch => <Route
					key={branch.id}
					path={branch.path}
					element={branch.element}
					index={branch.index}
				/>)
			}

			{renderRoutes(route.routes || [])}
		</Route>)
};

const AppRouter = () => {
	const {
		user
	} = useProfile();

	return <BrowserRouter>
		<Routes>
			{renderRoutes(
				appRoutesTree,
				user?.user_role
			)}
		</Routes>
	</BrowserRouter>
};

export default AppRouter;