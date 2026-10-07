import { GET as getDocs } from "@/app/api/docs/route";
import { GET as getOpenApi } from "@/app/api/openapi/route";
import { openApiSpec } from "@/lib/docs/openapi";

describe("GET /api/docs", () => {
    it("devuelve la página de Swagger UI apuntando a la especificación", async () => {
        const res = getDocs();
        const html = await res.text();

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("text/html");
        expect(html).toContain("swagger-ui");
        expect(html).toContain('url: "/api/openapi"');
    });
});

describe("GET /api/openapi", () => {
    it("devuelve la especificación OpenAPI en JSON", async () => {
        const res = getOpenApi();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(openApiSpec);
    });
});

describe("especificación OpenAPI", () => {
    it("documenta POST /api/transcribe con todas sus respuestas", () => {
        const operation = openApiSpec.paths["/api/transcribe"].post;

        expect(Object.keys(operation.responses).sort()).toEqual(["200", "400", "413", "422", "429", "500", "502"]);
    });

    it("todas las referencias $ref apuntan a componentes existentes", () => {
        const refs = JSON.stringify(openApiSpec).match(/"\$ref":"([^"]+)"/g) ?? [];
        expect(refs.length).toBeGreaterThan(0);

        for (const ref of refs) {
            const path = ref.replace('"$ref":"#/', "").replace(/"$/, "").split("/");
            const target = path.reduce<unknown>(
                (node, key) => (node as Record<string, unknown> | undefined)?.[key],
                openApiSpec
            );
            expect(target).toBeDefined();
        }
    });
});
