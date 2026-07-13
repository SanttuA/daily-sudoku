*** Settings ***
Resource          ../resources/common.resource
Suite Setup       Start Browser Suite
Suite Teardown    Stop Browser Suite
Test Teardown     Close Test Context


*** Test Cases ***
Signed In Player Can Submit Solve And See Leaderboard And History
    Open Fresh Page
    ${account}=    Create Unique Account Data    official    Official Player
    Sign Up In Browser    ${account}
    Fill Current Puzzle Solution
    Click    css=[data-testid="submit-score-button"]
    Wait For Condition    Text    css=.success-banner    contains    Official time saved.
    Go To    ${WEB_URL}/leaderboard
    Wait For Condition    Text    css=[data-testid="leaderboard-list"]    contains    Official Player
    Go To    ${WEB_URL}/history
    Wait For Condition    Text    css=tbody    contains    ${PUZZLE_ID}

Anonymous Completion API Request Is Rejected
    ${payload}=    Create Dictionary
    ...    puzzleDate=${PUZZLE_DATE}
    ...    elapsedSeconds=${120}
    ...    finalGrid=${PUZZLE_SOLUTION}
    ${response}=    RequestsLibrary.POST
    ...    ${API_URL}/attempts/complete
    ...    json=${payload}
    ...    expected_status=401
    ${body}=    Evaluate    $response.json()
    Should Be Equal    ${body}[error]    Sign in to submit an official score.

Invalid Solved Board Is Rejected
    ${alias}    ${account}=    Create API Account    invalid    Invalid Grid Player
    ${invalid_solution}=    Set Variable    1${PUZZLE_SOLUTION}[1:]
    ${response}=    Submit API Completion
    ...    ${alias}
    ...    ${PUZZLE_DATE}
    ...    ${invalid_solution}
    ...    120
    ...    400
    ${body}=    Evaluate    $response.json()
    Should Be Equal    ${body}[error]    Submitted grid is not a valid solution.

Only A Player's Best Retry Is Kept
    ${alias}    ${account}=    Create API Account    retries    Retry Player
    Submit API Completion    ${alias}    ${PUZZLE_DATE}    ${PUZZLE_SOLUTION}    120
    ${slower}=    Submit API Completion    ${alias}    ${PUZZLE_DATE}    ${PUZZLE_SOLUTION}    240
    ${slower_body}=    Evaluate    $slower.json()
    Should Be Equal As Integers    ${slower_body}[attempt][elapsedSeconds]    120
    ${faster}=    Submit API Completion    ${alias}    ${PUZZLE_DATE}    ${PUZZLE_SOLUTION}    60
    ${faster_body}=    Evaluate    $faster.json()
    Should Be Equal As Integers    ${faster_body}[attempt][elapsedSeconds]    60
    ${history}=    Get API History    ${alias}
    ${history_body}=    Evaluate    $history.json()
    Length Should Be    ${history_body}[attempts]    1
    Should Be Equal As Integers    ${history_body}[attempts][0][elapsedSeconds]    60

Leaderboard Uses Time Then Completion Time For Rank
    ${first_alias}    ${first_account}=    Create API Account    rank-first    Rank First
    ${second_alias}    ${second_account}=    Create API Account    rank-second    Rank Second
    ${fast_alias}    ${fast_account}=    Create API Account    rank-fast    Rank Fast
    Submit API Completion    ${first_alias}    ${PUZZLE_DATE}    ${PUZZLE_SOLUTION}    300
    Sleep    50ms
    Submit API Completion    ${second_alias}    ${PUZZLE_DATE}    ${PUZZLE_SOLUTION}    300
    Submit API Completion    ${fast_alias}    ${PUZZLE_DATE}    ${PUZZLE_SOLUTION}    200
    ${leaderboard}=    Get Daily Leaderboard
    ${first}=    Find Leaderboard Entry    ${leaderboard}    Rank First
    ${second}=    Find Leaderboard Entry    ${leaderboard}    Rank Second
    ${fast}=    Find Leaderboard Entry    ${leaderboard}    Rank Fast
    Should Be True    ${fast}[rank] < ${first}[rank]
    Should Be True    ${first}[rank] < ${second}[rank]

History Lists Most Recent Puzzle Date First
    ${alias}    ${account}=    Create API Account    history    History Player
    Submit API Completion    ${alias}    ${PREVIOUS_PUZZLE_DATE}    ${PREVIOUS_SOLUTION}    150
    Submit API Completion    ${alias}    ${PUZZLE_DATE}    ${PUZZLE_SOLUTION}    120
    Open Fresh Page    /auth/login
    Log In In Browser    ${account}
    Go To    ${WEB_URL}/history
    Wait For Condition    Element States    css=tbody tr:nth-child(1)    contains    visible
    ${first_row}=    Get Text    css=tbody tr:nth-child(1)
    ${second_row}=    Get Text    css=tbody tr:nth-child(2)
    Should Contain    ${first_row}    ${PUZZLE_ID}
    Should Contain    ${second_row}    ${PREVIOUS_PUZZLE_ID}
