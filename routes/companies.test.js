process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require('../app');
const db = require("../db");
const slugify = require("slugify");

let testCo;

beforeEach(async function() {
    const name = "Test Company";
    const testCode = slugify(name, {remove: /[*+~.()'"!:@]/g, lower: true});

    let coResult = await db.query(`
    INSERT INTO
        companies (code, name) VALUES ($1, $2)
        RETURNING code, name, description`, [testCode, name]);

    testCo = coResult.rows[0];

});

describe("GET / companies", function () {
    test("Gets a list of all companies", async function() {
        const response = await request(app).get(`/companies`);
        const indexOfTestCo = response.body.companies.findIndex(c => c.code === "test-company");
        expect(response.statusCode).toEqual(200);
        expect(indexOfTestCo).toBeGreaterThan(-1);
    });
});

describe("GET /companies/:code", function() {
    test("Gets one company by comp_Code", async function() {
        const response = await request(app).get(`/companies/${testCo.code}`);
        expect(response.statusCode).toEqual(200);
        expect(response.body.company.name).toEqual("Test Company");
        expect(response.body.company.code).toEqual(testCo.code);
        expect(response.body.company.description).toEqual(null);
    });

    test("Responds with 404 code if can't find company", async function() {
        const response = await request(app).get(`/companies/ooieje`);
        expect(response.statusCode).toEqual(404);
        expect(response.body).toEqual({"error": 404, "message": "No such company ooieje found."});
    });
});

describe("POST /companies", function() {
    test("Creates new company", async function() {
        const response = await request(app)
            .post(`/companies`)
            .send({code: "new-company", name: "New Company"});
        expect(response.statusCode).toEqual(201);
        expect(response.body.company.name).toEqual("New Company");
        expect(response.body.company.code).toEqual("new-company");
    });
});

describe("PUT /companies/:code", function() {
    test("Update existing company", async function() {
        const response = await request(app)
            .put(`/companies/${testCo.code}`)
            .send({name: "New Test Company", description: "test description"});

        expect(response.statusCode).toEqual(200);
        expect(response.body.company.name).toEqual("New Test Company");
        expect(response.body.company.description).toEqual("test description");
    });

    test("Responds with 404 if can't find company", async function() {
        const response = await request(app)
            .put(`/companies/nope`)
            .send({name: "Nope", description: "no description"});

        expect(response.statusCode).toEqual(404);
        expect(response.body).toEqual({"error": 404, "message": "No such company nope found."});
    });
});

describe("DELETE /companies/:code", function() {
    test("Delete existing company", async function() {
        const response = await request(app).delete(`/companies/new-company`);
        expect(response.statusCode).toEqual(200);
        expect(response.body).toEqual({status: "deleted"});
    });

    test("Response with 404 code if can't find company", async function() {
        const response = await request(app).delete("/companies/nope");

        expect(response.statusCode).toEqual(404);
        expect(response.body).toEqual({"error": 404, "message": "No such company nope found."});
    });
});

afterEach(async function() {
    await db.query(`DELETE FROM companies WHERE code = $1`, [testCo.code]);
});

afterAll(async function() {
    await db.end();
});