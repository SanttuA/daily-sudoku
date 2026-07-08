*** Settings ***
Library    Browser

*** Test Cases ***
Homepage Opens
    New Browser    chromium
    New Context
    New Page    http://localhost:3000

    Get Title

    Close Browser