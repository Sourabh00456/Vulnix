import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.core.config import settings
from app.core.security import get_current_user

router = APIRouter(prefix="/v1/billing", tags=["Billing"])

stripe.api_key = settings.STRIPE_API_KEY

# Using a generic placeholder for the price; updating to dynamic later easily
PRICE_ID = "price_H5ggYwtDq4f9Z" 

@router.get("/checkout")
def create_checkout_session(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not settings.STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe configuration missing Server-Side")
        
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': PRICE_ID,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{settings.FRONTEND_URL}/dashboard?status=success",
            cancel_url=f"{settings.FRONTEND_URL}/dashboard?status=cancel",
            client_reference_id=str(current_user.id),
            customer_email=current_user.email
        )
        return {"checkout_url": session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None), db: Session = Depends(get_db)):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get("client_reference_id")
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        
        if user_id:
            user = db.query(models.User).filter(models.User.id == int(user_id)).first()
            if user:
                user.stripe_customer_id = customer_id
                user.stripe_subscription_id = subscription_id
                user.plan_type = "pro"
                db.commit()

    elif event['type'] == 'invoice.paid':
        # Subscription payment successful (checkout creates this intrinsically too)
        pass 

    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        subscription_id = subscription.get("id")
        user = db.query(models.User).filter(models.User.stripe_subscription_id == subscription_id).first()
        if user:
            user.plan_type = "free"
            db.commit()

    return {"status": "success"}
