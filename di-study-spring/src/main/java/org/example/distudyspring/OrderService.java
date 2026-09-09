package org.example.distudyspring;

import org.springframework.stereotype.Component;

@Component
public class OrderService {
    private final NotificationSender notificationSender;

    public OrderService(NotificationSender notificationSender) {
        this.notificationSender = notificationSender;
    }

    public void placeOrder(String item) {
        System.out.println(item + " を注文しました");
        notificationSender.send(item + " の注文を受け付けました");
    }
}
