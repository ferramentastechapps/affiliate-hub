import socket
import ssl
from pprint import pprint

hostname = 'economizai.usejotashop.com.br'
port = 443

context = ssl.create_default_context()
context.check_hostname = False
context.verify_mode = ssl.CERT_NONE

try:
    with socket.create_connection((hostname, port)) as sock:
        with context.wrap_socket(sock, server_hostname=hostname) as ssock:
            der_cert = ssock.getpeercert(binary_form=True)
            # Python standard library has a private/internal helper that parses DER certs into dicts
            # without requiring pyOpenSSL or cryptography.
            decoded = ssl._ssl._test_decode_cert(ssock.context._wrap_socket(sock, server_hostname=hostname)._sslobj.getpeercert(True))
            pprint(decoded)
except Exception as e:
    # If the internal method fails, try another approach:
    try:
        # Just use standard socket connection and wrap it, then get PEER CERT
        # using ssl.DER_cert_to_PEM_cert
        with socket.create_connection((hostname, port)) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                der_cert = ssock.getpeercert(binary_form=True)
                pem_cert = ssl.DER_cert_to_PEM_cert(der_cert)
                print("PEM Certificate:")
                print(pem_cert)
    except Exception as ex:
        print("Error:", ex)
