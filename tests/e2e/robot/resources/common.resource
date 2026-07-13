*** Settings ***
Library         Browser
Library         Collections
Library         RequestsLibrary
Library         String


*** Variables ***
${WEB_URL}                  %{WEB_URL=http://127.0.0.1:3000}
${API_URL}                  %{API_URL=http://127.0.0.1:4000}
${BROWSER}                  %{BROWSER=chromium}
${TEST_PASSWORD}            robot-secret
${PUZZLE_DATE}              2026-04-16
${PREVIOUS_PUZZLE_DATE}     2026-04-15
${PUZZLE_ID}                variant-7
${PREVIOUS_PUZZLE_ID}       variant-6
${PUZZLE_GIVENS}            091340678348062910705918034526407189180529407079680523637094850804176092912803746
${PUZZLE_SOLUTION}          291345678348762915765918234526437189183529467479681523637294851854176392912853746
${PREVIOUS_SOLUTION}        189234567237651894654897123415326978972418356368579412526183749743965281891742635


*** Keywords ***
Start Browser Suite
    Require Deterministic Test Stack
    New Browser    browser=${BROWSER}    headless=${TRUE}

Stop Browser Suite
    Run Keyword And Ignore Error    Close Browser    ALL

Open Fresh Page
    [Arguments]    ${path}=/    ${color_scheme}=${NONE}
    New Context    colorScheme=${color_scheme}    locale=en-US
    New Page    ${WEB_URL}${path}

Close Test Context
    Run Keyword And Ignore Error    Close Context

Require Deterministic Test Stack
    ${response}=    RequestsLibrary.GET    ${API_URL}/daily-puzzle    expected_status=200
    ${payload}=    Evaluate    $response.json()
    ${puzzle}=    Get From Dictionary    ${payload}    puzzle
    ${actual_date}=    Get From Dictionary    ${puzzle}    puzzleDate
    Should Be Equal
    ...    ${actual_date}
    ...    ${PUZZLE_DATE}
    ...    Robot acceptance tests require FIXED_UTC_DATE=${PUZZLE_DATE}, but the API returned ${actual_date}.

Create Unique Account Data
    [Arguments]    ${prefix}=robot    ${display_name}=Robot Player
    ${suffix}=    Generate Random String    12    [LOWER][NUMBERS]
    ${account}=    Create Dictionary
    ...    displayName=${display_name}
    ...    email=${prefix}-${suffix}@example.com
    ...    password=${TEST_PASSWORD}
    RETURN    ${account}

Sign Up In Browser
    [Arguments]    ${account}
    Go To    ${WEB_URL}/auth/signup
    Fill Text    css=input[name="displayName"]    ${account}[displayName]
    Fill Text    css=input[name="email"]    ${account}[email]
    Fill Text    css=input[name="password"]    ${account}[password]
    Click    css=button[type="submit"]
    Wait For Condition    Url    should end with    /play
    Wait For Condition    Text    css=.header-actions .pill    ==    ${account}[displayName]

Log In In Browser
    [Arguments]    ${account}
    Go To    ${WEB_URL}/auth/login
    Fill Text    css=input[name="email"]    ${account}[email]
    Fill Text    css=input[name="password"]    ${account}[password]
    Click    css=button[type="submit"]
    Wait For Condition    Url    should end with    /play
    Wait For Condition    Text    css=.header-actions .pill    ==    ${account}[displayName]

Fill Current Puzzle Solution
    FOR    ${index}    IN RANGE    81
        IF    '${PUZZLE_GIVENS}[${index}]' == '0'
            Fill Text    css=[data-testid="cell-${index}"]    ${PUZZLE_SOLUTION}[${index}]
        END
    END

Timer Should Be Running
    ${timer}=    Get Text    css=[data-testid="elapsed-timer"]
    Should Not Be Equal    ${timer}    00:00

Create API Account
    [Arguments]    ${prefix}=api    ${display_name}=API Player
    ${account}=    Create Unique Account Data    ${prefix}    ${display_name}
    ${alias_suffix}=    Generate Random String    10    [LOWER][NUMBERS]
    ${alias}=    Set Variable    ${prefix}-${alias_suffix}
    RequestsLibrary.Create Session    ${alias}    ${API_URL}
    ${response}=    RequestsLibrary.POST On Session
    ...    ${alias}
    ...    /auth/signup
    ...    json=${account}
    ...    expected_status=200
    ${session_token}=    Evaluate    $response.cookies.get("daily_sudoku_session")
    Should Not Be Empty    ${session_token}
    ${auth_headers}=    Create Dictionary
    ...    Cookie=daily_sudoku_session=${session_token}
    RequestsLibrary.Update Session    ${alias}    headers=${auth_headers}
    RETURN    ${alias}    ${account}

Submit API Completion
    [Arguments]    ${alias}    ${puzzle_date}    ${solution}    ${elapsed_seconds}    ${expected_status}=200
    ${elapsed_seconds}=    Convert To Integer    ${elapsed_seconds}
    ${payload}=    Create Dictionary
    ...    puzzleDate=${puzzle_date}
    ...    elapsedSeconds=${elapsed_seconds}
    ...    finalGrid=${solution}
    ${response}=    RequestsLibrary.POST On Session
    ...    ${alias}
    ...    /attempts/complete
    ...    json=${payload}
    ...    expected_status=${expected_status}
    RETURN    ${response}

Get API History
    [Arguments]    ${alias}
    ${response}=    RequestsLibrary.GET On Session
    ...    ${alias}
    ...    /me/history
    ...    expected_status=200
    RETURN    ${response}

Get Daily Leaderboard
    [Arguments]    ${puzzle_date}=${PUZZLE_DATE}
    ${response}=    RequestsLibrary.GET
    ...    url=${API_URL}/leaderboards/daily?date=${puzzle_date}
    ...    expected_status=200
    RETURN    ${response}

Find Leaderboard Entry
    [Arguments]    ${response}    ${display_name}
    ${payload}=    Evaluate    $response.json()
    ${entries}=    Get From Dictionary    ${payload}    entries
    FOR    ${entry}    IN    @{entries}
        ${entry_name}=    Get From Dictionary    ${entry}    displayName
        IF    '${entry_name}' == '${display_name}'
            RETURN    ${entry}
        END
    END
    Fail    Leaderboard entry not found for ${display_name}.
