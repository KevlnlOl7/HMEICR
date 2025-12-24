# tasks/einvoice.py
from celery import shared_task

@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={"max_retries": 3})
def fetch_carrier_invoice_task(user_id, first_day, last_day):
    api = get_user_api(user_id)
    if not api:
        return {"error": "No API credentials"}

    return getCarrierInvoice(
        api,
        frist_day=first_day,
        last_day=last_day,
        size=50,
        page=0,
    )
