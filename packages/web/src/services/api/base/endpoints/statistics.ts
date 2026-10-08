import BaseAPIAbstractEndpoint from "./abstract";

import type { 
    DB$Enumerators
} from "@Madeirense/database/browser";

import {
    Madeirense$Enumerators,
    type Madeirense$Types,
    type countEntryType,
    type statisticsOverviewType
} from "@Madeirense/shared";

// ***************************************************************************************************************

class StatisticsEndpoints extends BaseAPIAbstractEndpoint {
    async overview(
        {
            query
        }: {
            query?: Madeirense$Types.searchQueryRecord
        } = {
                query: undefined
            }
    ) {
        return (await this.client.get<statisticsOverviewType>(`/statistics/overview`, query)).data;
    }

    async countTablePerColumn<Column = string>(
        table: keyof typeof DB$Enumerators.Tables,
        column: Column,
        {
            query
        }: {
            query?: Madeirense$Types.searchQueryRecord
        } = {
                query: undefined
            }
    ) {
        return (await this.client.get<countEntryType[]>(`/statistics/count/${table}/per/${column}`, query)).data;
    }

    async countTableRelation(
        table: keyof typeof DB$Enumerators.Tables,
        relation: keyof typeof DB$Enumerators.Tables,
        {
            query
        }: {
            query?: Madeirense$Types.searchQueryRecord
        } = {
                query: undefined
            }
    ) {
        return (await this.client.get<countEntryType[]>(`/statistics/${table}/${relation}/count`, query)).data;
    }

    async countTableRelationByAction<Payload = any>(
        table: keyof typeof DB$Enumerators.Tables,
        relation: keyof typeof DB$Enumerators.Tables,
        action: keyof typeof Madeirense$Enumerators.StatisticsParameters.Actions,
        {
            query
        }: {
            query?: Madeirense$Types.searchQueryRecord
        } = {
                query: undefined
            }
    ) {
        return (await this.client.get<Payload>(`/statistics/${table}/${relation}/${action}/count`, query)).data;
    }

    async topTableRelation<Payload = any>(
        table: keyof typeof DB$Enumerators.Tables,
        relation: keyof typeof DB$Enumerators.Tables,
        {
            query
        }: {
            query?: Madeirense$Types.searchQueryRecord
        } = {
                query: undefined
            }
    ) {
        return (await this.client.get<Payload>(`/statistics/${table}/${relation}/top`, query)).data;
    }

    async reportTableFact<Payload = any>(
        table: keyof typeof DB$Enumerators.Tables,
        fact: keyof typeof Madeirense$Enumerators.StatisticsParameters.Fact,
        {
            query
        }: {
            query?: Madeirense$Types.searchQueryRecord
        } = {
                query: undefined
            }
    ) {
        return (await this.client.get<Payload>(`/statistics/${table}/report/${fact}`, query)).data;
    }
};

export default StatisticsEndpoints;