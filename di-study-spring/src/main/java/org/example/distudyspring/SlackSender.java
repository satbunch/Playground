package org.example.distudyspring;

import org.springframework.stereotype.Component;

@Component
public class SlackSender implements NotificationSender {
    @Override
    public void send(String message) {
        System.out.println("Slackで送信: " + message);
    }
}
