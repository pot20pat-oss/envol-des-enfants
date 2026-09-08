import * as v from "valibot";

export const textInput = v.string();
export const optionalTextInput = v.optional(v.string());
export const numericInput = v.union([v.number(), v.string()]);
export const optionalNumericInput = v.optional(numericInput);
export const booleanInput = v.union([v.boolean(), v.number()]);
export const optionalBooleanInput = v.optional(booleanInput);

export async function validateJsonBody<TSchema extends v.GenericSchema>(
  request: Request,
  schema: TSchema,
): Promise<
  | { success: true; data: v.InferOutput<TSchema> }
  | { success: false; response: Response }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      success: false,
      response: Response.json({ error: "Corps JSON invalide." }, { status: 400 }),
    };
  }

  const result = v.safeParse(schema, raw);
  if (!result.success) {
    return {
      success: false,
      response: Response.json(
        {
          error: "Requête invalide.",
          fields: result.issues.map((issue) => ({
            path: issue.path?.map((item) => String(item.key)).join(".") || "body",
            message: issue.message,
          })),
        },
        { status: 400 },
      ),
    };
  }

  return { success: true, data: result.output };
}
