import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const signature = headersList.get("x-yuno-signature");
    
    // Verify webhook signature if needed (implement according to Yuno's documentation)
    // For now, we'll process the webhook without signature verification
    
    const webhookData = await request.json();
    
    console.log("Received Yuno webhook:", webhookData);
    
    // Extract payment information from webhook
    const {
      event_type,
      data: {
        id: paymentId,
        merchant_order_id: orderId,
        status,
        amount,
        currency,
        customer_payer,
        created_at,
        updated_at
      } = {}
    } = webhookData;

    // Handle different event types
    switch (event_type) {
      case "payment.created":
        console.log(`Payment created: ${paymentId} for order: ${orderId}`);
        break;
        
      case "payment.approved":
        console.log(`Payment approved: ${paymentId} for order: ${orderId}`);
        // Here you can update your database, send confirmation emails, etc.
        break;
        
      case "payment.declined":
        console.log(`Payment declined: ${paymentId} for order: ${orderId}`);
        // Handle declined payment
        break;
        
      case "payment.cancelled":
        console.log(`Payment cancelled: ${paymentId} for order: ${orderId}`);
        // Handle cancelled payment
        break;
        
      case "payment.refunded":
        console.log(`Payment refunded: ${paymentId} for order: ${orderId}`);
        // Handle refund
        break;
        
      default:
        console.log(`Unknown event type: ${event_type}`);
    }

    // Store webhook data in your database or process as needed
    // You might want to save this to a database for audit purposes
    
    return NextResponse.json({ 
      success: true, 
      message: "Webhook processed successfully" 
    });
    
  } catch (error) {
    console.error("Error processing Yuno webhook:", error);
    return NextResponse.json(
      { error: "Error processing webhook" }, 
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification (if needed)
export async function GET(request: Request) {
  return NextResponse.json({ 
    message: "Yuno webhook endpoint is active" 
  });
}