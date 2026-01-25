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

const initDB = async () => {
	// when building, Sveltekit prerenders pages using Node. In this step, we don't want to call duckdb.
	if (!browser) {
		return;
	}

	if (db) {
		return db; // Return existing database, if any
	}

	console.log('INIT DB');

	const logger = new duckdb.ConsoleLogger();
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

	// Instantiate worker (DuckDB recommends loading the worker by URL string for bundlers like Vite)
	const worker = new Worker(bundle.mainWorker);

	// and asynchronous database
	db = new duckdb.AsyncDuckDB(logger, worker);
	await db.instantiate(bundle.mainModule);

	await loadData();
	return db;
};

async function loadData() {
	console.log('loading parqet file in db');

	const response = await fetch(`${base}/database.parquet`);
	// const response = await fetch('database_onlyIreland.parquet');
	if (!response.ok) {
		throw new Error(`Failed to fetch ${base}/database.parquet (${response.status} ${response.statusText})`);
	}

	const arrayBuffer = await response.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);

	// Load the parquet file into the DuckDB instance
	await db.registerFileBuffer('filename', uint8Array);
	// await db.open({path: "filename"});

	const conn = await db.connect();

	await conn.query(`CREATE TABLE ${DB_TABLE_NAME} AS
  SELECT *
  FROM read_parquet('filename');`);
	console.log('Table created from parquet');

	// Load socio economic table (currenlty merged)
	// const response2 = await fetch(`${base}/tableSocio.parquet`);
	// const arrayBuffer2 = await response2.arrayBuffer();
	// const uint8Array2 = new Uint8Array(arrayBuffer2);
	//
	// // Load the parquet file into the DuckDB instance
	// await db.registerFileBuffer("filename2", uint8Array2);
	//
	// await conn.query(`CREATE TABLE ${DB_TABLE_SE_NAME} AS SELECT * FROM read_parquet('filename2');`);
	//
	// // Close the connection to release memory
	// await conn.close();

	// console.log("DB INFO: ", await getTableData(getInfo()));

	const result = await conn.query(`PRAGMA table_info(${DB_TABLE_NAME})`);
	// console.log("Table schema:", await result.toArray());

	await conn.close();
}

async function getTableData(request: string) {
	await initDB();

	const conn = await db.connect();

	// await conn.query(`CREATE TABLE ${DB_TABLE_NAME} AS SELECT * FROM read_parquet('filename');`);
	// console.log("Table created from parquet");

	// Now you can query the table
	// result is actually an Arrow Table
	// const result = await conn.query(`SELECT * FROM ${DB_TABLE_NAME}`);

	const result = await conn.query(request);

	// Close the connection to release memory
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
	// Select total line because the value is repeated for one LSOA
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

// CAST(25.65 AS int);
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

export function getModeSEFGroupedByLAD(sef: SEFactor) {
	let query;
	query = `SELECT mode(${sef}) as val, LAD as Lookup_Value
           FROM ${DB_TABLE_NAME}
           WHERE co_benefit_type = 'Total'
           GROUP BY LAD, scenario`;
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
		// Need to sum on selected cobenef and then average for the LAD
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

// Co-benefit=total to get only one row per datazone
export function getTotalCBAllDatazones(nation = 'UK') {
	let nationConstraint;
	if (nation != 'UK') {
		nationConstraint = `AND Nation='${nation}'`;
	} else {
		nationConstraint = ' ';
	}

	// return `SELECT total, Lookup_value, scenario, co_benefit_type, LAD, ${SEF.join(", ")}, ${TIMES.map(d => `"${d}"`).join(", ")}
	let query = `SELECT total,
                      Lookup_value,
                      scenario,
                      co_benefit_type,
                      LAD,
                      HH as Households,
                      ${SEF.join(', ')},
                      ${TIMES.map((d) => `"${d}"`).join(', ')}
               FROM ${DB_TABLE_NAME}
               WHERE co_benefit_type = 'Total'
                   ${nationConstraint}
	`;

	// let query = `SELECT total,
  //                     Lookup_value,
  //                     scenario,
  //                     co_benefit_type,
  //                     LAD,
  //                     HH as Households,
  //              FROM ${DB_TABLE_NAME}
  //              WHERE co_benefit_type = 'Total'
	// `;

// 	let query = `SELECT co_benefit_type,
//                       Lookup_value
//                FROM ${DB_TABLE_NAME}
// WHERE co_benefit_type = 'Total'
// 	`;

	console.log(99, query)

	return query;
}

// Co-benefit=total to get only one row per datazone
export function getAllCBAllDatazones() {
	// const roundedSEF = SEF.map(sef => `ROUND(${sef}) AS ${sef}`)

	// return `SELECT total, Lookup_value, scenario, co_benefit_type, LAD, ${roundedSEF.join(", ")  }
	return `SELECT total, Lookup_value, scenario, co_benefit_type, LAD, ${SEF.join(', ')}, ${TIMES.map((d) => `"${d}"`).join(', ')}
          FROM ${DB_TABLE_NAME}
          WHERE co_benefit_type!='Total'`;
}

// Co-benefit=total to get only one row per datazone. We can use this for the SEF data too.
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

// Useful for facetted charts, but not for individual charts.
export function getSefForOneCoBenefit(cobenefit: CoBenefit) {
	const oneQuery = (SE: SEFactor) => {
		return `SELECT total, Lookup_value, LAD, ${SE} AS SE, '${SE}' AS SEFMAME
            FROM ${DB_TABLE_NAME}
            WHERE co_benefit_type = '${cobenefit}'`;
	};

	// let SEF = ['Under_35', 'Over_65'];
	let query = SEF.map((sef) => oneQuery(sef)).join(' UNION ALL ');
	return query;
}

//export function getSefForOneCoBenefitAveragedByLAD(cobenefit: CoBenefit) {
//
//    const oneQuery = (SE: SEFactor) => {
//        return `SELECT AVG(total) as total, LAD, AVG(${SE}) AS SE, '${SE}' AS SEFMAME
//                FROM ${DB_TABLE_NAME}
//                WHERE co_benefit_type = '${cobenefit}'
//                GROUP BY LAD
//                `
//    }

//    // let SEF = ['Under_35', 'Over_65'];
//    let query = SEF.map(sef => oneQuery(sef)).join(" UNION ALL ");
//    return query;
//}

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

export function getAllLAD() {
	return `SELECT DISTINCT LAD
          FROM ${DB_TABLE_NAME}`;
}

// preview database (loged in landing page layout.ts)
export function previewTableData(limit = 10) {
	return `
      SELECT *
      FROM ${DB_TABLE_NAME} LIMIT ${limit}
	`;
}

// prepare for landing page waffle
export function getAggregationPerBenefit() {
	return `
      SELECT co_benefit_type, SUM(total) / 1000 as total
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type != 'Total'
      GROUP BY co_benefit_type
      ORDER BY co_benefit_type
	`;
}

// LAD total benefits for sorting the top 10 in display for landing page
export function getAggregatedTotalPerLAD() {
	return `
      SELECT LAD, SUM(total) AS total_value
      FROM ${DB_TABLE_NAME}
      WHERE co_benefit_type = 'Total'
      GROUP BY LAD
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

// preview the household data,  {HHs: 249n}, 249n being obj type
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

// display the top selected LADs, but ordered by total value, change order:-- ORDER BY value_per_household DESC
// unit 1k pounds per household
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

	// return `
  //     SELECT Nation
  //     FROM cobenefits
	// `;
}

// per household for aggregate co ben values
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

export { initDB, getTableData }; // so we can import this elsewhere