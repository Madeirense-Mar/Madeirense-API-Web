import type { 
    ILocator
} from "@Madeirense/shared";

import type { 
    statusType
} from "./types";

// ***************************************************************************************************************

interface IState<Custom, Status extends string> {
    status: statusType<Status>;
    error: Error | null;
    data: Custom;
};

export interface IComponentState<Custom, Status extends string = "idle"> extends IState<Custom, Status> {};
export interface IPageState<Custom, Status extends string = "idle"> extends IState<Custom, Status> {};

export interface ITempProfile {
    id: `REF-${string}`;
    location: ILocator | null;
};