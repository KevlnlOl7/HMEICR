"""
Security Event Logging Module
Structured logging for authentication and security events
"""

import logging
from datetime import datetime
from functools import wraps
from flask import request, g
import json

# Configure security logger
security_logger = logging.getLogger('security')
security_logger.setLevel(logging.INFO)

# File handler for security events
security_handler = logging.FileHandler('logs/security.log')
security_handler.setLevel(logging.INFO)

# JSON formatter for structured logs
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'event': record.msg,
            'ip': getattr(record, 'ip', None),
            'user': getattr(record, 'user', None),
            'endpoint': getattr(record, 'endpoint', None),
            'method': getattr(record, 'method', None),
           'status': getattr(record, 'status', None),
            'details': getattr(record, 'details', {})
        }
        return json.dumps(log_data)

security_handler.setFormatter(JSONFormatter())
security_logger.addHandler(security_handler)

# Also log to console in development
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.WARNING)  # Only warnings and errors to console
console_handler.setFormatter(logging.Formatter('[%(levelname)s] %(message)s'))
security_logger.addHandler(console_handler)


def get_client_ip():
    """Get the real client IP address (handles proxies)"""
    if request.headers.getlist("X-Forwarded-For"):
        return request.headers.getlist("X-Forwarded-For")[0]
    return request.remote_addr


def log_security_event(event_type, user=None, status='success', details=None):
    """
    Log a security event
    
    Args:
        event_type: Type of event (login_attempt, logout, rate_limit, etc.)
        user: User email or identifier
        status: success, failure, blocked
        details: Additional details dictionary
    """
    extra = {
        'ip': get_client_ip(),
        'user': user or 'anonymous',
        'endpoint': request.endpoint,
        'method': request.method,
        'status': status,
        'details': details or {}
    }
    
    log_level = logging.INFO
    if status == 'failure' or status == 'blocked':
        log_level = logging.WARNING
    
    security_logger.log(log_level, event_type, extra=extra)


def log_auth_attempt(success=True):
    """Decorator to log authentication attempts"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            email = request.form.get('email', 'unknown')
            
            # Log attempt before execution
            log_security_event(
                'auth_attempt_start',
                user=email,
                status='in_progress',
                details={'endpoint': request.endpoint}
            )
            
            try:
                result = f(*args, **kwargs)
                
                # Determine if successful based on response
                if hasattr(result, 'status_code'):
                    is_success = result.status_code == 200 or result.status_code == 201
                else:
                    is_success = True
                
                log_security_event(
                    f'{request.endpoint}_complete',
                    user=email,
                    status='success' if is_success else 'failure',
                    details={
                        'response_code': getattr(result, 'status_code', None)
                    }
                )
                
                return result
            except Exception as e:
                log_security_event(
                    f'{request.endpoint}_error',
                    user=email,
                    status='failure',
                    details={'error': str(e)}
                )
                raise
        
        return decorated_function
    return decorator


def log_rate_limit_exceeded(user=None):
    """Log rate limit violations"""
    log_security_event(
        'rate_limit_exceeded',
        user=user or 'anonymous',
        status='blocked',
        details={
            'user_agent': request.headers.get('User-Agent', 'unknown')
        }
    )


def log_validation_failure(field, value_type, user=None):
    """Log input validation failures (potential attack attempts)"""
    log_security_event(
        'validation_failure',
        user=user or 'anonymous',
        status='blocked',
        details={
            'field': field,
            'value_type': value_type,
            'endpoint': request.endpoint
        }
    )


def log_unauthorized_access(user=None, resource=None):
    """Log unauthorized access attempts"""
    log_security_event(
        'unauthorized_access',
        user=user or 'anonymous',
        status='blocked',
        details={
            'resource': resource,
            'user_agent': request.headers.get('User-Agent', 'unknown')
        }
    )


def log_session_event(event, user):
    """Log session-related events (login, logout, timeout)"""
    log_security_event(
        f'session_{event}',
        user=user,
        status='success',
        details={}
    )


# Initialize logs directory
import os
if not os.path.exists('logs'):
    os.makedirs('logs')
    # Create initial security log file
    with open('logs/security.log', 'w') as f:
        f.write('')  # Create empty file
