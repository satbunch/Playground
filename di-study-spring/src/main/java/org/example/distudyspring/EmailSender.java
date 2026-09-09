package org.example.distudyspring;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Primary
@Component
public class EmailSender implements NotificationSender {
    @Override
    public void send(String message) {
        System.out.println("Emailで送信: " + message);
    }
}
