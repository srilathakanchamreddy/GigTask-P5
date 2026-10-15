
const request = require("supertest");
const { app } = require("../server");

describe("POST /api/fund-gig", () => {
  test("rejects invalid UUIDs with 400", async () => {
    const response = await request(app)
      .post("/api/fund-gig")
      .send({
        clientId: "invalid-client-id",
        freelancerId: "invalid-freelancer-id",
        budget: 100
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  test("rejects a zero budget with 400", async () => {
    const response = await request(app)
      .post("/api/fund-gig")
      .send({
        clientId: "48066893-553f-4199-aabd-7e3ae4a97192",
        freelancerId: "d811b541-b0f2-4129-a413-3984ff5ea66b",
        budget: 0
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  test("rejects a negative budget with 400", async () => {
    const response = await request(app)
      .post("/api/fund-gig")
      .send({
        clientId: "48066893-553f-4199-aabd-7e3ae4a97192",
        freelancerId: "d811b541-b0f2-4129-a413-3984ff5ea66b",
        budget: -100
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });
});

