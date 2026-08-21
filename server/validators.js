const { z } = require('zod');

const eventSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters long"),
  description: z.string().optional().nullable(),
  dateType: z.enum(["exact", "tentative"]).optional().default("exact"),
  date: z.string().min(1, "Date is required"),
  tentativeDate: z.string().optional().nullable(),
  location: z.string().min(2, "Location is required"),
  duration: z.string().min(1, "Duration is required"),
  eventType: z.string().min(2, "Event type is required"),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  registrationFee: z.coerce.number().min(0, "Registration fee cannot be negative"),
  feeType: z.string().min(2, "Fee type is required"),
  category: z.string().optional().nullable(),
  livePosEnabled: z.any().optional(),
  exemptAuthorIds: z.any().optional(),
  status: z.string().optional(),
  aggAuthors: z.any().optional(),
  aggSent: z.any().optional(),
  aggSold: z.any().optional(),
  aggRevenue: z.any().optional(),
  aggEligibleAuthors: z.any().optional(),
  notifyAllAuthors: z.any().optional()
}).passthrough().superRefine((data, ctx) => {
  if (data.dateType === 'exact' && isNaN(Date.parse(data.date))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid date format for exact date",
      path: ["date"]
    });
  }
});

module.exports = { eventSchema };

