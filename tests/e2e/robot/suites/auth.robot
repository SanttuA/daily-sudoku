*** Settings ***
Resource          ../resources/common.resource
Suite Setup       Start Browser Suite
Suite Teardown    Stop Browser Suite
Test Teardown     Close Test Context


*** Test Cases ***
New User Can Sign Up And Session Survives Reload
    Open Fresh Page
    ${account}=    Create Unique Account Data    signup    Signup Player
    Sign Up In Browser    ${account}
    ${cookie}=    Get Cookie    daily_sudoku_session
    Should Be True    ${cookie.httpOnly}
    Should Be Equal    ${cookie.sameSite}    Lax
    Reload
    Wait For Condition    Text    css=.header-actions .pill    ==    Signup Player
    Get Element Count    css=a:has-text("Log in")    ==    0

Returning User Can Log In And Log Out
    ${alias}    ${account}=    Create API Account    returning    Returning Player
    Open Fresh Page    /auth/login
    Fill Text    css=input[name="email"]    ${account}[email]
    Fill Text    css=input[name="password"]    ${account}[password]
    Click    css=button[type="submit"]
    Wait For Condition    Text    css=.header-actions .pill    ==    Returning Player
    Click    css=button:has-text("Log out")
    Wait For Condition    Element States    css=a:has-text("Log in")    contains    visible
    Get Element Count    css=.header-actions .pill    ==    0

Signup Form Accepts Display Name Email And Password
    Open Fresh Page    /auth/signup
    ${account}=    Create Unique Account Data    fields    Form Player
    Fill Text    css=input[name="displayName"]    ${account}[displayName]
    Fill Text    css=input[name="email"]    ${account}[email]
    Fill Text    css=input[name="password"]    ${account}[password]
    Get Property    css=input[name="displayName"]    value    ==    Form Player
    Get Property    css=input[name="email"]    value    ==    ${account}[email]
    Get Property    css=input[name="password"]    value    ==    ${TEST_PASSWORD}
