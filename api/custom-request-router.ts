import { z } from "zod";
import { authedQuery, publicQuery, createRouter } from "./middleware";
import {
  createCustomRequest,
  listCustomRequestsForUser,
} from "./queries/customRequests";

/**
 * The Base44 CustomProject form. All user-supplied text is length-capped;
 * rights_confirmed must be explicitly true (the design IP confirmation
 * checkbox) or the request is rejected.
 */
export const customProjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional(),
  phrase: z.string().trim().min(2).max(500),
  story: z.string().trim().max(5000).optional(),
  language: z.enum(["en", "ar"]).default("en"),
  recipient: z.string().trim().max(120).optional(),
  occasion: z.string().trim().max(200).optional(),
  tone: z.enum(["subtle", "bold", "sarcastic", "clean", "colorful"]).optional(),
  garment: z.string().trim().max(60).optional(),
  color: z.string().trim().max(60).optional(),
  size: z.string().trim().max(10).optional(),
  quantity: z.number().int().min(1).max(100).default(1),
  placement: z.string().trim().max(60).optional(),
  needed_by: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
  reference_files: z.array(z.string().trim().max(2_000_000)).max(4).optional(),
  rights_confirmed: z
    .boolean()
    .refine((v) => v === true, {
      message: "You must confirm you have the rights to the design assets.",
    }),
});

export const customRequestRouter = createRouter({
  /** Public: submit a custom "خربش ع ذوقك" project. */
  submit: publicQuery
    .input(customProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { needed_by, reference_files, rights_confirmed, ...rest } = input;
      return createCustomRequest({
        ...rest,
        neededBy: needed_by,
        referenceFiles: reference_files ?? [],
        rightsConfirmed: rights_confirmed,
        userId: ctx.user?.id ?? undefined,
      });
    }),

  /** Authed: the caller's own custom projects, resolved by session email. */
  mine: authedQuery.query(async ({ ctx }) => {
    return listCustomRequestsForUser(ctx.user.email ?? "");
  }),
});
