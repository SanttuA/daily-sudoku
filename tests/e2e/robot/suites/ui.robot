*** Settings ***
Resource          ../resources/common.resource
Suite Setup       Start Browser Suite
Suite Teardown    Stop Browser Suite
Test Teardown     Close Test Context


*** Test Cases ***
First Visit Follows System Color Preference
    Open Fresh Page    /    dark
    Wait For Condition    Attribute    css=html    data-theme    ==    dark
    Get Text    css=[data-testid="theme-toggle"]    ==    Light mode

Explicit Theme Persists Across Reload And Every Route
    Open Fresh Page    /    light
    Wait For Condition    Attribute    css=html    data-theme    ==    light
    Click    css=[data-testid="theme-toggle"]
    Wait For Condition    Attribute    css=html    data-theme    ==    dark
    Reload
    Wait For Condition    Attribute    css=html    data-theme    ==    dark
    @{routes}=    Create List
    ...    /
    ...    /play
    ...    /auth/signup
    ...    /auth/login
    ...    /leaderboard
    ...    /history
    FOR    ${route}    IN    @{routes}
        Go To    ${WEB_URL}${route}
        Wait For Condition    Attribute    css=html    data-theme    ==    dark
        Wait For Condition    Element States    css=[data-testid="theme-toggle"]    contains    visible
    END

Browser Metadata Exposes Application Icons And Manifest
    Open Fresh Page
    Get Title    ==    Daily Sudoku
    Get Attribute    css=link[rel="manifest"]    href    should end with    /manifest.webmanifest
    ${icon_count}=    Get Element Count    css=link[rel="icon"]
    Should Be True    ${icon_count} > 0
    ${apple_icon_count}=    Get Element Count    css=link[rel="apple-touch-icon"]
    Should Be True    ${apple_icon_count} > 0
    ${response}=    RequestsLibrary.GET    ${WEB_URL}/manifest.webmanifest    expected_status=200
    ${manifest}=    Evaluate    $response.json()
    Should Be Equal    ${manifest}[name]    Daily Sudoku
    Should Be Equal    ${manifest}[display]    standalone
    Length Should Be    ${manifest}[icons]    2
    Should Be Equal    ${manifest}[icons][0][sizes]    192x192
    Should Be Equal    ${manifest}[icons][1][sizes]    512x512
