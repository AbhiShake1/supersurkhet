import { z } from 'zod';

export const dataMatrixActionSchema = z.object({
  version: z.string().default('1.0'),
  action: z.enum([
    'wifi_connect',
    'profile_enrichment',
    'equipment_session',
    'restaurant_ordering',
    'product_interaction',
    'navigate',
    'form_request',
    'choice_selection',
    'notification',
    'equipment_control',
  ]),
  wifi: z
    .object({
      ssid: z.string(),
      password: z.string(),
      security: z.enum(['WPA2', 'WPA3', 'WEP', 'open']).optional(),
    })
    .optional(),
  navigation: z
    .object({
      url: z.string().url(),
      params: z
        .record(z.string(), z.union([z.string(), z.boolean(), z.number()]))
        .optional(),
    })
    .optional(),
  post_connect: z
    .object({
      notification: z.object({
        title: z.string(),
        message: z.string(),
      }),
    })
    .optional(),
  checks: z
    .array(
      z.object({
        field: z.string(),
        required: z.boolean().optional(),
        if_missing: z
          .object({
            type: z.enum(['form_request', 'choice_selection']),
            schema: z
              .object({
                title: z.string(),
                fields: z
                  .array(
                    z.object({
                      name: z.string(),
                      type: z.string(),
                      required: z.boolean().optional(),
                      label: z.string(),
                    }),
                  )
                  .optional(),
              })
              .optional(),
            options: z
              .array(
                z.object({
                  value: z.string(),
                  label: z.string(),
                }),
              )
              .optional(),
            multiple: z.boolean().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  on_complete: z
    .object({
      type: z.enum(['navigate', 'notification']),
      url: z.string().url().optional(),
      message: z.string().optional(),
    })
    .optional(),
  equipment: z
    .object({
      id: z.string(),
      type: z.string(),
      location: z.string(),
    })
    .optional(),
  session: z
    .object({
      duration: z.number(),
      max_duration: z.number().optional(),
      extendable: z.boolean().optional(),
    })
    .optional(),
  user_validation: z
    .object({
      membership_required: z.boolean().optional(),
      min_fitness_level: z.string().optional(),
    })
    .optional(),
  actions: z
    .object({
      on_start: z
        .object({
          type: z.enum(['equipment_control']),
          command: z.enum(['activate']),
          parameters: z.record(z.string(), z.string()).optional(),
        })
        .optional(),
      on_extend: z
        .object({
          type: z.enum(['confirm']),
          message: z.string(),
          actions: z
            .object({
              confirm: z.object({
                type: z.enum(['equipment_control']),
                command: z.enum(['extend_session']),
                duration: z.number(),
              }),
            })
            .optional(),
        })
        .optional(),
      on_end: z
        .object({
          type: z.enum(['equipment_control']),
          command: z.enum(['deactivate']),
        })
        .optional(),
    })
    .optional(),
  restaurant: z
    .object({
      id: z.string(),
      table: z.string(),
    })
    .optional(),
  flow: z
    .object({
      steps: z.array(
        z.object({
          step: z.number(),
          type: z.enum([
            'menu_display',
            'order_building',
            'order_confirmation',
            'payment_selection',
          ]),
          categories: z.array(z.string()).optional(),
          filters: z
            .object({
              dietary: z.string().optional(),
              availability: z.string().optional(),
            })
            .optional(),
          features: z
            .object({
              customization: z.boolean().optional(),
              special_requests: z.boolean().optional(),
              combo_suggestions: z.boolean().optional(),
            })
            .optional(),
          validation: z
            .object({
              allergen_check: z.boolean().optional(),
              preparation_time: z.string().optional(),
            })
            .optional(),
          options: z
            .array(z.enum(['card', 'mobile_payment', 'cash']))
            .optional(),
          tip_suggestions: z.array(z.number()).optional(),
        }),
      ),
    })
    .optional(),
  product: z
    .object({
      id: z.string(),
      sku: z.string(),
    })
    .optional(),
  interactions: z
    .object({
      info: z
        .object({
          type: z.enum(['product_details']),
          sections: z.array(z.string()),
        })
        .optional(),
      demo: z
        .object({
          type: z.enum(['ar_experience']),
          model: z.string(),
          features: z.array(z.string()),
        })
        .optional(),
      compare: z
        .object({
          type: z.enum(['product_comparison']),
          related_products: z.array(z.string()),
        })
        .optional(),
      purchase: z
        .object({
          type: z.enum(['quick_buy']),
          options: z.object({
            delivery: z.array(z.enum(['in_store', 'home_delivery'])),
            payment: z.array(z.string()),
          }),
        })
        .optional(),
    })
    .optional(),
});

export type DataMatrixAction = z.infer<typeof dataMatrixActionSchema>;
