import {
  AbstractNotificationService,
  CustomerService,
  OrderService,
} from "@medusajs/medusa";
import { Novu } from "@novu/node";

class NovuNotificationsService extends AbstractNotificationService {
  static identifier = "novu-notifications";

  protected orderService: OrderService;
  protected customerService: CustomerService;

  protected novu: Novu;

  constructor(container) {
    super(container);

    this.orderService = container.orderService;
    this.customerService = container.customerService;
    this.novu = new Novu(process.env.NOVU_API_KEY);
  }

  async sendNotification(
    event: string,
    data: any,
    attachmentGenerator: unknown
  ): Promise<{  
    to: string;
    status: string;
    data: Record<string, unknown>;
  }> {
    if (event === "order.placed") {
      const order = await this.orderService.retrieve(data.id, {
        relations: ["customer", "shipping_address", "payments"],
      });

      const orderData = {
        phone: order.shipping_address.phone,
        orderId: order.id.split("_")[1],
        name: `${order.shipping_address.first_name} ${order.shipping_address.last_name}`,
        amount: (order.payments[0].amount / 100).toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        }),
      };

      await this.novu.trigger("medusa-store-notifications", {
        to: {
          subscriberId: order.email,
          email: order.email,
          phone: order.shipping_address.phone,
        },
        payload: orderData,
      });

      return {
        to: order.email,
        status: "done",
        data: orderData,
      };
    }
  }

  async resendNotification(
    notification: any,
    config: any,
    attachmentGenerator: unknown
  ): Promise<{
    to: string;
    status: string;
    data: Record<string, unknown>;
  }> {
    const to: string = config.to ? config.to : notification.to;

    await this.novu.trigger("medusa-store-notifications", {
      to: {
        subscriberId: to,
        email: to,
        phone: notification.data.phone,
      },
      payload: notification.data,
    });

    return {
      to,
      status: "done",
      data: notification.data,
    };
  }
}

export default NovuNotificationsService;
