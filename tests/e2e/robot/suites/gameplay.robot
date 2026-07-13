*** Settings ***
Resource          ../resources/common.resource
Suite Setup       Start Browser Suite
Suite Teardown    Stop Browser Suite
Test Teardown     Close Test Context


*** Test Cases ***
Homepage Shows Daily Context And Routes Into Play
    Open Fresh Page
    Get Title    ==    Daily Sudoku
    Get Text    css=h1    ==    Arrive calm. Solve when you're ready.
    Get Element Count    css=[data-testid="sudoku-board"]    ==    0
    Click    css=a:has-text("Play today's puzzle")
    Wait For Condition    Url    should end with    /play
    Wait For Condition    Element States    css=[data-testid="sudoku-board"]    contains    visible

Play Page Loads The Fixed UTC Daily Puzzle
    Open Fresh Page    /play
    Wait For Condition    Element States    css=[data-testid="sudoku-board"]    contains    visible
    Get Text    css=.play-sidebar h1    ==    Thu, Apr 16, 2026
    Get Element Count    css=.sudoku-cell    ==    81
    Get Text    css=[data-testid="elapsed-timer"]    ==    00:00

Board Protects Givens And Accepts Only Digits One Through Nine
    Open Fresh Page    /play
    Wait For Condition    Element States    css=[data-testid="cell-0"]    contains    editable
    ${given_states}=    Get Element States    css=[data-testid="cell-1"]
    List Should Contain Value    ${given_states}    disabled
    ${editable_states}=    Get Element States    css=[data-testid="cell-0"]
    List Should Contain Value    ${editable_states}    editable
    Fill Text    css=[data-testid="cell-0"]    0
    Get Property    css=[data-testid="cell-0"]    value    ==    ${EMPTY}
    Fill Text    css=[data-testid="cell-0"]    a
    Get Property    css=[data-testid="cell-0"]    value    ==    ${EMPTY}
    Fill Text    css=[data-testid="cell-0"]    2
    Get Property    css=[data-testid="cell-0"]    value    ==    2

Anonymous Progress Persists Across Refresh
    Open Fresh Page    /play
    Wait For Condition    Element States    css=[data-testid="cell-0"]    contains    editable
    Fill Text    css=[data-testid="cell-0"]    2
    Reload
    Wait For Condition    Property    css=[data-testid="cell-0"]    value    ==    2

Authenticated Progress Persists Across Refresh
    Open Fresh Page
    ${account}=    Create Unique Account Data    progress    Progress Player
    Sign Up In Browser    ${account}
    Fill Text    css=[data-testid="cell-0"]    2
    Reload
    Wait For Condition    Property    css=[data-testid="cell-0"]    value    ==    2
    Get Text    css=.header-actions .pill    ==    Progress Player

Timer Starts On First Editable Move And Reset Clears Progress
    Open Fresh Page    /play
    Wait For Condition    Element States    css=[data-testid="cell-0"]    contains    editable
    Sleep    1.5s
    Get Text    css=[data-testid="elapsed-timer"]    ==    00:00
    Fill Text    css=[data-testid="cell-0"]    2
    Wait Until Keyword Succeeds    5s    250ms    Timer Should Be Running
    Click    css=button:has-text("Reset board")
    Get Property    css=[data-testid="cell-0"]    value    ==    ${EMPTY}
    Get Text    css=[data-testid="elapsed-timer"]    ==    00:00

Solved Board Shows Completion And Freezes The Timer
    Open Fresh Page    /play
    Wait For Condition    Element States    css=[data-testid="cell-0"]    contains    editable
    Fill Current Puzzle Solution
    Wait For Condition
    ...    Text
    ...    css=.status-stack .supporting-copy
    ...    contains
    ...    Grid solved locally.
    ${completed_time}=    Get Text    css=[data-testid="elapsed-timer"]
    Sleep    1.5s
    Get Text    css=[data-testid="elapsed-timer"]    ==    ${completed_time}
    Get Element States    css=[data-testid="submit-score-button"]    contains    enabled

Anonymous Player Cannot Submit An Official Score
    Open Fresh Page    /play
    Wait For Condition    Element States    css=[data-testid="cell-0"]    contains    editable
    Fill Current Puzzle Solution
    Click    css=[data-testid="submit-score-button"]
    Wait For Condition
    ...    Text
    ...    css=.error-banner
    ...    ==
    ...    Sign in before you submit an official leaderboard time.
