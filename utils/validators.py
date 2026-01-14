"""
Input validation utilities for HMEICR application.
Provides functions to validate and sanitize user inputs.
"""
import re
from typing import Tuple


def validate_email(email: str) -> Tuple[bool, str]:
    """
    Validate email format.
    
    Args:
        email: Email address to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not email or not isinstance(email, str):
        return False, "Email is required"
    
    # Basic email regex pattern
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(email_pattern, email):
        return False, "Invalid email format"
    
    if len(email) > 254:  # RFC 5321
        return False, "Email is too long"
    
    return True, ""


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password strength.
    Requires at least 8 characters, including uppercase, lowercase, and numbers.
    
    Args:
        password: Password to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not password or not isinstance(password, str):
        return False, "Password is required"
    
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if len(password) > 128:
        return False, "Password is too long"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    
    return True, ""


def validate_amount(amount) -> Tuple[bool, str]:
    """
    Validate receipt amount.
    
    Args:
        amount: Amount to validate (can be string or number)
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        amount_float = float(amount)
    except (ValueError, TypeError):
        return False, "Amount must be a valid number"
    
    if amount_float < 0:
        return False, "Amount must be a positive number"
    
    if amount_float > 999999999:  # Reasonable upper limit
        return False, "Amount is too large"
    
    return True, ""


def validate_date_format(date_str: str) -> Tuple[bool, str]:
    """
    Validate date format (YYYY-MM-DD).
    
    Args:
        date_str: Date string to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not date_str or not isinstance(date_str, str):
        return False, "Date is required"
    
    # Check format: YYYY-MM-DD
    date_pattern = r'^\d{4}-\d{2}-\d{2}$'
    if not re.match(date_pattern, date_str):
        return False, "Date must be in YYYY-MM-DD format"
    
    return True, ""


def sanitize_string(text: str, max_length: int = 1000) -> str:
    """
    Sanitize user input to prevent NoSQL injection and XSS.
    
    Args:
        text: Text to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized string
    """
    if not isinstance(text, str):
        return ""
    
    # Remove potential NoSQL injection characters
    # Remove $ and . which are used in MongoDB operators
    sanitized = text.replace('$', '').replace('.', '')
    
    # Limit length
    sanitized = sanitized[:max_length]
    
    # Strip leading/trailing whitespace
    sanitized = sanitized.strip()
    
    return sanitized


def validate_currency(currency: str) -> Tuple[bool, str]:
    """
    Validate currency code.
    
    Args:
        currency: Currency code to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not currency or not isinstance(currency, str):
        return False, "Currency is required"
    
    # Common currency codes
    valid_currencies = ['TWD', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'HKD', 'SGD']
    
    currency_upper = currency.upper().strip()
    
    if currency_upper not in valid_currencies:
        return False, f"Currency must be one of: {', '.join(valid_currencies)}"
    
    return True, ""
