process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require('../app');
const db = require("../db");
const slugify = require("slugify");

let testInv;
let invCo;

beforeAll(async function() {
    
    const name = "Inv Company";
    const code = slugify(name, {remove: /[*+~.()'"!:@]/g, lower: true});

    let coResult = await db.query(`
    INSERT INTO
        companies (code, name) VALUES ($1, $2)
        RETURNING code, description, name`, [code, name]);

    invCo = coResult.rows[0];

    let invResult = await db.query(`
        INSERT INTO 
            invoices (comp_code, amt) VALUES ($1, $2)
            RETURNING id, comp_code, amt, paid, add_date, paid_date`, 
            [invCo.code, 300]);

    const {id, comp_code, amt, paid, add_date, paid_date} = invResult.rows[0];

    testInv = {id: id, comp_code: comp_code, amt: amt, paid: paid, add_date: add_date.toISOString(), paid_date: paid_date};

});

describe("GET / invoices", function () {

    test("Gets a list of all invoices", async function() {
        const response = await request(app).get(`/invoices`);
        expect(response.statusCode).toEqual(200);
        expect(response.body).toEqual({
            invoices: [testInv]
        });
    });

});

describe("GET / invoices/:id", function() {

    test("Gets a list of single invoice", async function() {
        const response = await request(app).get(`/invoices/${testInv.id}`);
        expect(response.statusCode).toEqual(200);
        expect(response.body.invoice).toEqual(testInv);
    });

    test("Response with 404 code if invoice is not found.", async function() {
        const resp = await request(app).get(`/invoices/000`);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.message).toEqual("No such invoice ID 000 found.");
    });

});

describe("POST /invoices", function() {

    test("Creates new invoice", async function() {
        const resp = await request(app)
            .post(`/invoices`)
            .send({comp_code: invCo.code, amt: 300});
        expect(resp.statusCode).toEqual(201);
        expect(resp.body.invoice.comp_code).toEqual(invCo.code);
        expect(resp.body.invoice.amt).toEqual(300);
        expect(resp.body.invoice.paid).toBeFalsy();
    });

    test("Response with 404 if cannot find company", async function() {
        const resp = await request(app)
            .post(`/invoices`)
            .send({comp_code: "no-company", amt: 300});
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.message).toEqual(`'no-company' is not a valid company code.`)
    });

});

describe("PUT /invoices/:id", function() {
    test("Update existing invoice to paid", async function() {
        const resp = await request(app)
            .put(`/invoices/${testInv.id}`)
            .send({amt: 100, paid: true});
        expect(resp.statusCode).toEqual(200);
        expect(resp.body.invoice.amt).toEqual(100);
        expect(resp.body.invoice.paid).toBeTruthy();
        expect(resp.body.invoice.paid_date).not.toBeNull();
    });

    test("Update existing invoice to unpaid", async function() {
        const resp = await request(app)
            .put(`/invoices/${testInv.id}`)
            .send({amt: 300, paid: false});
        expect(resp.statusCode).toEqual(200);
        expect(resp.body.invoice.amt).toEqual(300);
        expect(resp.body.invoice.paid).toBeFalsy();
        expect(resp.body.invoice.paid_date).toBeNull();
    });

    test("Responds with 404 error if invoice does not exist", async function() {
        const resp = await request(app)
            .put(`/invoices/000`)
            .send({amt: 300, paid: false});
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.message).toEqual("No such invoice ID 000 found.");
    });
});

describe("DELETE / invoices/:id", function() {
    test("Delete invoice", async function() {
        const resp = await request(app).delete(`/invoices/${testInv.id}`);
        expect(resp.statusCode).toEqual(200);
        expect(resp.body).toEqual({status: "deleted"});
    });

    test("Responds with 404 error if invoice does not exist", async function() {
        const resp = await request(app).delete(`/invoices/000`);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.message).toEqual("No such invoice ID 000 found.");
    });
});

afterAll(async function() {
    await db.query("DELETE FROM invoices");
    await db.query(`DELETE FROM companies WHERE code = $1`, [invCo.code]);
    await db.end();
});