import * as duckdb from '@duckdb/duckdb-wasm';
import mvp_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import eh_wasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import type { AsyncDuckDB } from '@duckdb/duckdb-wasm';

import {
	type CoBenefit,
	COBENEFS,
	type Scenario,
	SEF,
	type SEFactor,
	TIMES,
	SEF_CATEGORICAL,
	type Nation
} from '../globals';
import { browser } from '$app/environment';
import { base } from '$app/paths';
import { csv } from 'd3';

let db: AsyncDuckDB;

// Name of the database table name
const DB_TABLE_NAME = 'cobenefits';
const DB_TABLE_SE_NAME = 'socioEconmicFactors';

// Geo level type
export type GeoLevel = 'LAD' | 'P_Code';

const initDB = async () => {
	if (!browser) {
		return;
	}

	if (db) {
		return db;
	}

	console.log('INIT DB');

	const logger = import.meta.env.DEV
		? new duckdb.ConsoleLogger(duckdb.LogLevel.DEBUG)
		: new duckdb.VoidLogger();
	const bundle = await duckdb.selectBundle({
		mvp: {
			mainModule: mvp_wasm,
			mainWorker: mvp_worker
		},
		eh: {
			mainModule: eh_wasm,
			mainWorker: eh_worker
		}
	});

	const worker = new Worker(bundle.mainWorker);

	db = new duckdb.AsyncDuckDB(logger, worker);
	await db.instantiate(bundle.mainModule);

	await loadData();
	return db;
};

async function loadData() {
	console.log('loading parqet file in db');

	const parquetUrl = new URL(`${base}/database.parquet`, window.location.origin).toString();
	await db.registerFileURL('database.parquet', parquetUrl, duckdb.DuckDBDataProtocol.HTTP, false);

	const conn = await db.connect();

	await conn.query(`CREATE TABLE ${DB_TABLE_NAME} AS
  SELECT *
  FROM read_parquet('database.parquet');`);
	console.log('Table created from parquet');

	const result = await conn.query(`PRAGMA table_info(${DB_TABLE_NAME})`);

	await conn.close();
}

async function getTableData(request: string) {
	await initDB();

	const conn = await db.connect();

	const result = await conn.query(request);

	await conn.close();

	const allData = result.toArray().map((row) => row.toJSON());
	return allData;
}

export function getInfo() {
	return `
      SELECT *
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = N'${DB_TABLE_NAME}'
	`;
}

export function getTotalPerPathway() {
	return `SELECT total, scenario, Lookup_Value
          FROM ${DB_TABLE_NAME}
          WHERE co_benefit_type = 'Total'`;
}

export function getSEFData(sef: SEFactor) {
	const multiplyBy100 = ['Under_35', 'Over_65', 'Unemployment'].includes(sef);
	const valExpression = multiplyBy100 ? `(${sef} * 100)` : sef;

	const query = `
      SELECT ${valExpression} as val, total, total / population as total_per_capita, Lookup_Value
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type = 'Total'
	`;

	return query;
}

export function getSEFbyCobenData(sef: SEFactor) {
	let query = `SELECT ${sef} as val, total, total / population as total_per_capita, Lookup_Value, co_benefit_type
               FROM ${DB_TABLE_NAME}
               WHERE co_benefit_type != 'Total'`;
	return query;
}

export function getAverageSEFbyCobenDataGroupedByLAD(sef: SEFactor) {
	let query = `SELECT AVG(${sef})        as val,
                      total,
                      total / population as total_per_capita,
                      LAD                as Lookup_Value,
                      co_benefit_type
               FROM ${DB_TABLE_NAME}
               WHERE co_benefit_type != 'Total'
               GROUP BY LAD, scenario`;
	return query;
}

export function getAverageSEFbyCobenDataGroupedByP_Code(sef: SEFactor) {
	let query = `SELECT AVG(${sef})        as val,
                      total,
                      total / population as total_per_capita,
                      P_Code             as Lookup_Value,
                      co_benefit_type
               FROM ${DB_TABLE_NAME}
               WHERE co_benefit_type != 'Total'
               GROUP BY P_Code, scenario`;
	return query;
}

export function getAverageSEFGroupedByLAD(sef: SEFactor) {
	const isCategorical = SEF_CATEGORICAL.includes(sef);
	const multiplyBy100 = ['Under_35', 'Over_65', 'Unemployment'].includes(sef);
	const valExpression = multiplyBy100 ? `(${sef} * 100)` : sef;

	const aggregation = isCategorical
		? `MODE() WITHIN GROUP (ORDER BY ${sef})`
		: `AVG(${valExpression})`;

	const query = `
      SELECT ${aggregation}               AS val,
             AVG(total)                   AS total,
             AVG(total) / AVG(population) AS total_per_capita,
             LAD                          AS Lookup_Value
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type = 'Total'
      GROUP BY LAD, scenario
	`;

	return query;
}

export function getAverageSEFGroupedByP_Code(sef: SEFactor) {
	const isCategorical = SEF_CATEGORICAL.includes(sef);
	const multiplyBy100 = ['Under_35', 'Over_65', 'Unemployment'].includes(sef);
	const valExpression = multiplyBy100 ? `(${sef} * 100)` : sef;

	const aggregation = isCategorical
		? `MODE() WITHIN GROUP (ORDER BY ${sef})`
		: `AVG(${valExpression})`;

	const query = `
      SELECT ${aggregation}               AS val,
             AVG(total)                   AS total,
             AVG(total) / AVG(population) AS total_per_capita,
             P_Code                       AS Lookup_Value
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type = 'Total'
      GROUP BY P_Code, scenario
	`;

	return query;
}

export function allCBgetAverageSEFGroupedByLAD(sef: SEFactor) {
	const isCategorical = SEF_CATEGORICAL.includes(sef);
	const multiplyBy100 = ['Under_35', 'Over_65', 'Unemployment'].includes(sef);
	const valExpression = multiplyBy100 ? `(${sef} * 100)` : sef;

	const aggregation = isCategorical
		? `MODE() WITHIN GROUP (ORDER BY ${sef})`
		: `AVG(${valExpression})`;

	const query = `
      SELECT ${aggregation}               AS val,
             AVG(total)                   AS total,
             AVG(total) / AVG(population) AS total_per_capita,
             LAD                          AS Lookup_Value,
             co_benefit_type
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type != 'Total'
      GROUP BY LAD, scenario, co_benefit_type
	`;

	return query;
}

export function allCBgetAverageSEFGroupedByP_Code(sef: SEFactor) {
	const isCategorical = SEF_CATEGORICAL.includes(sef);
	const multiplyBy100 = ['Under_35', 'Over_65', 'Unemployment'].includes(sef);
	const valExpression = multiplyBy100 ? `(${sef} * 100)` : sef;

	const aggregation = isCategorical
		? `MODE() WITHIN GROUP (ORDER BY ${sef})`
		: `AVG(${valExpression})`;

	const query = `
      SELECT ${aggregation}               AS val,
             AVG(total)                   AS total,
             AVG(total) / AVG(population) AS total_per_capita,
             P_Code                       AS Lookup_Value,
             co_benefit_type
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type != 'Total'
      GROUP BY P_Code, scenario, co_benefit_type
	`;

	return query;
}

export function getModeSEFGroupedByLAD(sef: SEFactor) {
	let query;
	query = `SELECT mode(${sef}) as val, LAD as Lookup_Value
           FROM ${DB_TABLE_NAME}
           WHERE co_benefit_type = 'Total'
           GROUP BY LAD, scenario`;
	return query;
}

export function getModeSEFGroupedByP_Code(sef: SEFactor) {
	let query;
	query = `SELECT mode(${sef}) as val, P_Code as Lookup_Value
           FROM ${DB_TABLE_NAME}
           WHERE co_benefit_type = 'Total'
           GROUP BY P_Code, scenario`;
	return query;
}

export function getCustomCBData(cobenefits: CoBenefit[], scenario: Scenario, time = 'total') {
	let query;

	if (cobenefits.length == 0) {
		query = `SELECT "${time}" as val, "${time}" / population as value_per_capita, scenario, Lookup_Value
             FROM ${DB_TABLE_NAME}
             WHERE co_benefit_type = 'Total'`;
	} else {
		query = `SELECT "${time}" as val, "${time}" / population as value_per_capita, scenario, Lookup_Value
             FROM ${DB_TABLE_NAME}
             WHERE co_benefit_type in (${cobenefits.map((v) => `'${v}'`).join(',')})`;
	}
	return query;
}

export function getAverageCBGroupedByLAD(
	cobenefits: CoBenefit[],
	scenario: Scenario,
	time = 'total'
) {
	let query;

	if (cobenefits.length == 0) {
		query = `SELECT scenario, AVG("${time}") as val, LAD as Lookup_Value
             FROM ${DB_TABLE_NAME}
             WHERE co_benefit_type = 'Total'
             GROUP BY LAD, scenario`;
	} else {
		query = `
        SELECT scenario, AVG(val) as val, LAD as Lookup_Value
        FROM (SELECT Lookup_Value, scenario, SUM("${time}") as val, LAD
              FROM ${DB_TABLE_NAME}
              WHERE co_benefit_type in (${cobenefits.map((v) => `'${v}'`).join(',')})
              GROUP BY Lookup_value, LAD, scenario) AS summed
        GROUP BY LAD, scenario
		`;
	}
	return query;
}

export function getAverageCBGroupedByP_Code(
	cobenefits: CoBenefit[],
	scenario: Scenario,
	time = 'total'
) {
	let query;

	if (cobenefits.length == 0) {
		query = `SELECT scenario, AVG("${time}") as val, P_Code as Lookup_Value
             FROM ${DB_TABLE_NAME}
             WHERE co_benefit_type = 'Total'
             GROUP BY P_Code, scenario`;
	} else {
		query = `
        SELECT scenario, AVG(val) as val, P_Code as Lookup_Value
        FROM (SELECT Lookup_Value, scenario, SUM("${time}") as val, P_Code
              FROM ${DB_TABLE_NAME}
              WHERE co_benefit_type in (${cobenefits.map((v) => `'${v}'`).join(',')})
              GROUP BY Lookup_value, P_Code, scenario) AS summed
        GROUP BY P_Code, scenario
		`;
	}
	return query;
}

export function getSUMCBGroupedByLAD(cobenefits: CoBenefit[], nation = 'UK', time = 'total') {
	let query;

	let nationConstraint;
	if (nation != 'UK') {
		nationConstraint = `AND Nation='${nation}'`;
	} else {
		nationConstraint = ' ';
	}

	if (cobenefits.length == 0) {
		query = `SELECT scenario,
                    SUM("${time}")                   as val,
                    SUM("${time}") / SUM(Population) AS value_per_capita,
                    LAD                              as Lookup_Value
             FROM ${DB_TABLE_NAME}
             WHERE co_benefit_type = 'Total'
                 ${nationConstraint}
             GROUP BY LAD, scenario`;
	} else {
		query = `SELECT scenario,
                    SUM("${time}")                   as val,
                    SUM("${time}") / SUM(Population) AS value_per_capita,
                    LAD                              as Lookup_Value
             FROM ${DB_TABLE_NAME}
             WHERE co_benefit_type in (${cobenefits.map((v) => `'${v}'`).join(',')})
                 ${nationConstraint}
             GROUP BY LAD, scenario`;
	}

	return query;
}

export function getSUMCBGroupedByP_Code(cobenefits: CoBenefit[], nation = 'UK', time = 'total') {
	let query;

	let nationConstraint;
	if (nation != 'UK') {
		nationConstraint = `AND Nation='${nation}'`;
	} else {
		nationConstraint = ' ';
	}

	if (cobenefits.length == 0) {
		query = `SELECT scenario,
                    SUM("${time}")                   as val,
                    SUM("${time}") / SUM(Population) AS value_per_capita,
                    P_Code                           as Lookup_Value
             FROM ${DB_TABLE_NAME}
             WHERE co_benefit_type = 'Total'
                 ${nationConstraint}
             GROUP BY P_Code, scenario`;
	} else {
		query = `SELECT scenario,
                    SUM("${time}")                   as val,
                    SUM("${time}") / SUM(Population) AS value_per_capita,
                    P_Code                           as Lookup_Value
             FROM ${DB_TABLE_NAME}
             WHERE co_benefit_type in (${cobenefits.map((v) => `'${v}'`).join(',')})
                 ${nationConstraint}
             GROUP BY P_Code, scenario`;
	}

	return query;
}

export function getSUMCBGroupedByLADAndCB(time = 'total', nation = 'UK') {
	let nationConstraint;
	if (nation != 'UK') {
		nationConstraint = `AND Nation='${nation}'`;
	} else {
		nationConstraint = ' ';
	}

	let query = `SELECT SUM("${time}") as val, LAD as Lookup_Value, co_benefit_type
               FROM ${DB_TABLE_NAME}
               WHERE co_benefit_type in (${COBENEFS.map((v) => `'${v.id}'`).join(',')})
                   ${nationConstraint}
               GROUP BY LAD, co_benefit_type`;

	return query;
}

export function getSUMCBGroupedByP_CodeAndCB(time = 'total', nation = 'UK') {
	let nationConstraint;
	if (nation != 'UK') {
		nationConstraint = `AND Nation='${nation}'`;
	} else {
		nationConstraint = ' ';
	}

	let query = `SELECT SUM("${time}") as val, P_Code as Lookup_Value, co_benefit_type
               FROM ${DB_TABLE_NAME}
               WHERE co_benefit_type in (${COBENEFS.map((v) => `'${v.id}'`).join(',')})
                   ${nationConstraint}
               GROUP BY P_Code, co_benefit_type`;

	return query;
}

export function getTotalPerBenefit() {
	return `SELECT total, co_benefit_type
          FROM ${DB_TABLE_NAME}
          WHERE co_benefit_type!='Total'`;
}

export function getTotalPerOneCoBenefit(cobenefit: CoBenefit) {
	return `SELECT total, Lookup_Value, scenario, co_benefit_type, LAD, ${SEF.join(', ')}, ${TIMES.map((d) => `"${d}"`).join(', ')}
          FROM ${DB_TABLE_NAME}
          WHERE co_benefit_type = '${cobenefit}'`;
}

export function getTotalForOneZone(datazone: string) {
	return `SELECT total, Lookup_Value, scenario
          FROM ${DB_TABLE_NAME}
          WHERE Lookup_Value = '${datazone}'`;
}

export function getTotalCBAllDatazones(nation = 'UK') {
	let nationConstraint;
	if (nation != 'UK') {
		nationConstraint = `AND Nation='${nation}'`;
	} else {
		nationConstraint = ' ';
	}

	let query = `SELECT total,
                      Lookup_value,
                      scenario,
                      co_benefit_type,
                      LAD,
                      P_Code,
                      HH as Households,
                      ${SEF.join(', ')},
                      ${TIMES.map((d) => `"${d}"`).join(', ')}
               FROM ${DB_TABLE_NAME}
               WHERE co_benefit_type = 'Total'
                   ${nationConstraint}
	`;

	console.log(99, query)

	return query;
}

export function getAllCBAllDatazones() {
	return `SELECT total, Lookup_value, scenario, co_benefit_type, LAD, P_Code, ${SEF.join(', ')}, ${TIMES.map((d) => `"${d}"`).join(', ')}
          FROM ${DB_TABLE_NAME}
          WHERE co_benefit_type!='Total'`;
}

export function getTotalCBForOneLAD(LAD: string) {
	let q = `SELECT total,
                  total / Population as totalPerCapita,
                  Lookup_value,
                  co_benefit_type,
                  LAD,
                  scenario,
                  ${TIMES.map((d) => `"${d}"`).join(', ')},
                  ${SEF.join(', ')}
           FROM ${DB_TABLE_NAME}
           WHERE LAD = '${LAD}'
             AND co_benefit_type = 'Total'`;

	return q;
}

export function getTotalCBForOneP_Code(P_Code: string) {
	let q = `SELECT total,
                  total / Population as totalPerCapita,
                  Lookup_value,
                  co_benefit_type,
                  P_Code,
                  P_Name,
                  scenario,
                  ${TIMES.map((d) => `"${d}"`).join(', ')},
                  ${SEF.join(', ')}
           FROM ${DB_TABLE_NAME}
           WHERE P_Code = '${P_Code}'
             AND co_benefit_type = 'Total'`;

	return q;
}

export function getTotalCBForOneNation(nation: Nation) {
	let q = `SELECT total,
                  total / Population as totalPerCapita,
                  Lookup_value,
                  co_benefit_type,
                  LAD,
                  scenario,
                  Nation,
                  ${TIMES.map((d) => `"${d}"`).join(', ')},
                  ${SEF.join(', ')}
           FROM ${DB_TABLE_NAME}
           WHERE Nation = '${nation}'
             AND co_benefit_type = 'Total'`;
	return q;
}

export function getAllCBForOneLAD(LAD: string) {
	return `SELECT total, Lookup_value, co_benefit_type, LAD, scenario, ${SEF.join(', ')}, ${TIMES.map((d) => `"${d}"`).join(', ')}
          FROM ${DB_TABLE_NAME}
          WHERE LAD = '${LAD}'
            AND co_benefit_type!='Total'
	`;
}

export function getAllCBForOneP_Code(P_Code: string) {
	return `SELECT total, Lookup_value, co_benefit_type, P_Code, scenario, ${SEF.join(', ')}, ${TIMES.map((d) => `"${d}"`).join(', ')}
          FROM ${DB_TABLE_NAME}
          WHERE P_Code = '${P_Code}'
            AND co_benefit_type!='Total'
	`;
}

export function getAllCBForOneNation(nation: Nation) {
	return `SELECT total,
                 Lookup_value,
                 co_benefit_type,
                 LAD,
                 Nation,
                 scenario,
                 ${SEF.join(', ')},
                 ${TIMES.map((d) => `"${d}"`).join(', ')}
          FROM ${DB_TABLE_NAME}
          WHERE Nation = '${nation}'
            AND co_benefit_type!='Total'
	`;
}

export function getTotalCBForOneLADTimed(LAD: string) {
	return `SELECT total, Lookup_value, co_benefit_type, LAD, scenario
          FROM ${DB_TABLE_NAME}
          WHERE LAD = '${LAD}'
            AND co_benefit_type!='Total'
	`;
}

export function getTotalCBForOneP_CodeTimed(P_Code: string) {
	return `SELECT total, Lookup_value, co_benefit_type, P_Code, scenario
          FROM ${DB_TABLE_NAME}
          WHERE P_Code = '${P_Code}'
            AND co_benefit_type!='Total'
	`;
}

export function getSefForOneCoBenefit(cobenefit: CoBenefit) {
	const oneQuery = (SE: SEFactor) => {
		return `SELECT total, Lookup_value, LAD, ${SE} AS SE, '${SE}' AS SEFMAME
            FROM ${DB_TABLE_NAME}
            WHERE co_benefit_type = '${cobenefit}'`;
	};

	let query = SEF.map((sef) => oneQuery(sef)).join(' UNION ALL ');
	return query;
}

export function getSefForOneCoBenefitAveragedByLAD(cobenefit: CoBenefit) {
	const oneQuery = (SE: SEFactor) => {
		const isCategorical = SEF_CATEGORICAL.includes(SE);
		const aggregation = isCategorical ? `MODE() WITHIN GROUP (ORDER BY ${SE})` : `AVG(${SE})`;

		return `
        SELECT AVG(total / NULLIF(TRY_CAST(REPLACE(CAST(HH AS TEXT), 'n', '') AS DOUBLE), 0)) AS total,
               LAD,
               ${aggregation}          AS SE,
               '${SE}'                 AS SEFMAME
        FROM ${DB_TABLE_NAME}
        WHERE co_benefit_type = '${cobenefit}'
        GROUP BY LAD
		`;
	};

	const query = SEF.map(oneQuery).join(' UNION ALL ');
	return query;
}

export function getSefForOneCoBenefitAveragedByP_Code(cobenefit: CoBenefit) {
	const oneQuery = (SE: SEFactor) => {
		const isCategorical = SEF_CATEGORICAL.includes(SE);
		const aggregation = isCategorical ? `MODE() WITHIN GROUP (ORDER BY ${SE})` : `AVG(${SE})`;

		return `
        SELECT AVG(total / NULLIF(TRY_CAST(REPLACE(CAST(HH AS TEXT), 'n', '') AS DOUBLE), 0)) AS total,
               P_Code,
               ${aggregation}          AS SE,
               '${SE}'                 AS SEFMAME
        FROM ${DB_TABLE_NAME}
        WHERE co_benefit_type = '${cobenefit}'
        GROUP BY P_Code
		`;
	};

	const query = SEF.map(oneQuery).join(' UNION ALL ');
	return query;
}

export function getAllLAD() {
	return `SELECT DISTINCT LAD
          FROM ${DB_TABLE_NAME}`;
}

export function getAllP_Codes() {
	return `SELECT DISTINCT P_Code
          FROM ${DB_TABLE_NAME}`;
}

export function previewTableData(limit = 10) {
	return `
      SELECT *
      FROM ${DB_TABLE_NAME} LIMIT ${limit}
	`;
}

export function getAggregationPerBenefit() {
	return `
      SELECT co_benefit_type, SUM(total) / 1000 as total
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type != 'Total'
      GROUP BY co_benefit_type
      ORDER BY co_benefit_type
	`;
}

export function getAggregatedTotalPerLAD() {
	return `
      SELECT LAD, SUM(total) AS total_value
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type = 'Total'
      GROUP BY LAD
	`;
}

export function getAggregatedTotalPerP_Code() {
	return `
      SELECT P_Code, SUM(total) AS total_value
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type = 'Total'
      GROUP BY P_Code
	`;
}

export function getTopSeletedLADsByTotal(n: number) {
	return `
      SELECT LAD, SUM(total) AS total_value
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type = 'Total'
      GROUP BY LAD
      ORDER BY total_value DESC
          LIMIT ${n}
	`;
}

export function getTopSeletedP_CodesByTotal(n: number) {
	return `
      SELECT P_Code, SUM(total) AS total_value
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type = 'Total'
      GROUP BY P_Code
      ORDER BY total_value DESC
          LIMIT ${n}
	`;
}

export function getDistinctHHsValues() {
	return `
      SELECT DISTINCT HH
      FROM ${DB_TABLE_NAME}
      WHERE HH IS NOT NULL LIMIT 50
	`;
}

export function getDistinctNationValues() {
	return `
      SELECT DISTINCT Nation
      FROM ${DB_TABLE_NAME}
      WHERE Nation IS NOT NULL LIMIT 50
	`;
}

export function getDistinctLookupValueCount() {
	return `
      SELECT COUNT(DISTINCT Lookup_Value) AS distinct_lookup_count
      FROM ${DB_TABLE_NAME}
      WHERE Lookup_Value IS NOT NULL
	`;
}

export function getLADRegion() {
	return `
      SELECT DISTINCT LAD, Nation
      FROM ${DB_TABLE_NAME}
      WHERE "LAD" IS NOT NULL
        AND "NATION" IS NOT NULL
	`;
}

export function getNbOfLAD() {
	return `
      SELECT DISTINCT LAD
      FROM ${DB_TABLE_NAME}
      WHERE "LAD" IS NOT NULL
        AND "NATION" IS NOT NULL
	`;
}

export function getTotalPerHouseholdByLAD() {
	return `
      SELECT LAD,
             SUM(total)                                                                       AS total_value,
             SUM(TRY_CAST(REPLACE(CAST(HH AS TEXT), 'n', '') AS DOUBLE))                      AS total_HHs,
             SUM(total) / SUM(TRY_CAST(REPLACE(CAST(HH AS TEXT), 'n', '') AS DOUBLE))         AS value_per_household
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type = 'Total'
        AND HH IS NOT NULL
      GROUP BY LAD
      ORDER BY value_per_household DESC
	`;
}

export function getTotalPerHouseholdByP_Code() {
	return `
      SELECT P_Code,
             SUM(total)                                                                       AS total_value,
             SUM(TRY_CAST(REPLACE(CAST(HH AS TEXT), 'n', '') AS DOUBLE))                      AS total_HHs,
             SUM(total) / SUM(TRY_CAST(REPLACE(CAST(HH AS TEXT), 'n', '') AS DOUBLE))         AS value_per_household
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type = 'Total'
        AND HH IS NOT NULL
      GROUP BY P_Code
      ORDER BY value_per_household DESC
	`;
}

export function getTopSelectedLADsPerHousehold(n: number) {
	return `
      SELECT LAD,
             SUM(total)                                                                              AS total_value,
             SUM(TRY_CAST(REPLACE(CAST(HH AS TEXT), 'n', '') AS DOUBLE))                             AS total_HHs,
             SUM(total) / SUM(TRY_CAST(REPLACE(CAST(HH AS TEXT), 'n', '') AS DOUBLE)) *
             1000                                                                                    AS value_per_household
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type = 'Total'
        AND HH IS NOT NULL
      GROUP BY LAD
      ORDER BY total_value DESC
          LIMIT ${n}
	`;
}

export function getTopSelectedP_CodesPerHousehold(n: number) {
	return `
      SELECT P_Code,
             SUM(total)                                                                              AS total_value,
             SUM(TRY_CAST(REPLACE(CAST(HH AS TEXT), 'n', '') AS DOUBLE))                             AS total_HHs,
             SUM(total) / SUM(TRY_CAST(REPLACE(CAST(HH AS TEXT), 'n', '') AS DOUBLE)) *
             1000                                                                                    AS value_per_household
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type = 'Total'
        AND HH IS NOT NULL
      GROUP BY P_Code
      ORDER BY total_value DESC
          LIMIT ${n}
	`;
}

export function getTopSelectedLADs({
	limit = 12,
	sortBy = 'total',
	region = 'All'
}: {
	limit?: number;
	sortBy?: 'total' | 'per_capita';
	region?: string;
}) {
	const nationFilter = region && region !== 'All' ? `AND Nation = '${region}'` : '';

	const orderBy = sortBy === 'per_capita' ? 'value_per_capita DESC' : 'total_value DESC';

	return `
	  SELECT
	      LAD,
	      Nation,
	      SUM(total) / 1000 AS total_value,
	      SUM(Population) AS total_Population,
	      SUM(total) / SUM(Population) * 1000000 AS value_per_capita
	  FROM cobenefits
	  WHERE co_benefit_type = 'Total'
	    AND Population IS NOT NULL
	    ${nationFilter}
	  GROUP BY LAD, Nation
	  ORDER BY ${orderBy}
	  LIMIT ${limit};
	`;
}

export function getTopSelectedP_Codes({
	limit = 12,
	sortBy = 'total',
	region = 'All'
}: {
	limit?: number;
	sortBy?: 'total' | 'per_capita';
	region?: string;
}) {
	const nationFilter = region && region !== 'All' ? `AND Nation = '${region}'` : '';

	const orderBy = sortBy === 'per_capita' ? 'value_per_capita DESC' : 'total_value DESC';

	return `
	  SELECT
	      P_Code,
	      Nation,
	      SUM(total) / 1000 AS total_value,
	      SUM(Population) AS total_Population,
	      SUM(total) / SUM(Population) * 1000000 AS value_per_capita
	  FROM cobenefits
	  WHERE co_benefit_type = 'Total'
	    AND Population IS NOT NULL
	    ${nationFilter}
	  GROUP BY P_Code, Nation
	  ORDER BY ${orderBy}
	  LIMIT ${limit};
	`;
}

export function getAggregationPerCapitaPerBenefit() {
	return `
      SELECT co_benefit_type,
             SUM(total) / 1000                      AS total_value,
             SUM(total) / SUM(Population) * 1000000 AS value_per_capita
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type != 'Total'
          AND Population IS NOT NULL
      GROUP BY co_benefit_type
      ORDER BY co_benefit_type
	`;
}

export function getTotalAggregation() {
	return `
      SELECT SUM(total) / 1000                   AS total_value,
             SUM(total) / SUM(Population) * 1000 AS total_value_per_capita
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type != 'Total'
        AND Population IS NOT NULL
	`;
}

export function getTotalLAD(LAD: string) {
	return `
      SELECT SUM(total) / 1000                   AS total_value,
             SUM(total) / SUM(Population) * 1000 AS total_value_per_capita
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type == 'Total'
      GROUP BY co_benefit_type
          AND Population IS NOT NULL
	`;
}

export function getAllP_CodeNames() {
    return `
        SELECT DISTINCT P_Code, P_Name, Nation
        FROM ${DB_TABLE_NAME}
        WHERE P_Code IS NOT NULL
          AND P_Name IS NOT NULL
    `;
}

export function getAllSPC_CodeNames() {
    return `
        SELECT DISTINCT SPC_Code, SPC_Name
        FROM ${DB_TABLE_NAME}
        WHERE SPC_Code IS NOT NULL
          AND SPC_Name IS NOT NULL
          AND Nation = 'Scotland'
    `;
}

export { initDB, getTableData };