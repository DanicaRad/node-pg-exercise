process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require('../app');
const db = require("../db");
const slugify = require("slugify");

let testInd;

beforeAll(async function() {
    const result = await db.query(
        `INSERT INTO industries (code, industry)
            VALUES ($1, $2)
            RETURNING code, industry`,
            ["test-ind", "Test Industry"]);

    testInd = result.rows[0];
});

describe("GET /industries", function() {
    test("Gets list of all industries", async function() {
        const resp = await request(app).get(`/industries`);
        expect(resp.statusCode).toEqual(200);
    });
});

describe("POST /industries", function() {
    test("Creates new industry", async function() {
        const resp = await request(app)
            .post(`/industries`)
            .send({code: "new-ind", industry: "New Test Industry"});
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({"industry": {"code": "new-ind", "industry": "New Test Industry"}});
    });
});

describe("POST /industries/:code", function() {

    let indCo;

    beforeEach(async function() {
        const result = await db.query(`
            INSERT INTO companies (code, name)
                VALUES ($1, $2)
                RETURNING code, name, description`,
                ["ind-test-co", "Industry Test Comp"]);

        indCo = result.rows[0];
    });

    test("Creates new company industry relation", async function() {
        const resp = await request(app)
            .post(`/industries/${testInd.code}`)
            .send({ind_code: testInd.code, comp_code: indCo.code});
        expect(resp.statusCode).toEqual(200);
        expect(resp.body).toEqual({"company industry": {"ind_code": testInd.code, "comp_code": indCo.code}});
    });

    afterEach(async function() {
        await db.query(`DELETE FROM companies WHERE code = $1`, [indCo.code]);
    });
});

afterAll(async function() {
    await db.query("DELETE FROM industries");
    await db.end();
});