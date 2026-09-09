public class EmailSender implements NotificationSender {
    @Override
    public void send(String message) {
        System.out.println("Emailで送信: " + message);
    }
}
