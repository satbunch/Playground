public class SlackSender implements NotificationSender {
    @Override
    public void send(String message) {
        System.out.println("Slackで送信: " + message);
    }
}
