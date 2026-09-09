public class Main {
    public static void main(String[] args) {
        NotificationSender sender = new SlackSender();
        OrderService orderService = new OrderService(sender);

        orderService.placeOrder("キーボード");
    }
}
