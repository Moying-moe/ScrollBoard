import * as dto from "./dto";
import * as vo from "./vo";
import * as util from "./util";

import React, { useState, useEffect, useCallback, useRef, useMemo, CSSProperties } from "react";
import FlipMove from "react-flip-move";
import { StickyContainer, Sticky } from "react-sticky";
import { Transition } from "react-transition-group";

function cvtColor(state: vo.ProblemStateKind): string | undefined {
    if (state === vo.ProblemStateKind.Passed) {
        return "green";
    }
    if (state === vo.ProblemStateKind.Failed) {
        return "red";
    }
    if (state === vo.ProblemStateKind.Pending) {
        return "orange";
    }
    return undefined;
}

interface BoardProps {
    data: dto.Contest;
    options: vo.BoardOptions;
}

const Board: React.FC<BoardProps> = ({ data, options }: BoardProps) => {

    const [state, setState] = useState<vo.ContestState>(useMemo(() => vo.calcContestState(data), [data]));

    const [highlightItem, setHighlightItem] = useState<vo.HighlightItem | null>(null);

    const revealGen = useRef<vo.RevealGen>(vo.reveal(state));

    const highlightNodeRef = useRef<HTMLSpanElement | null>(null);

    const [highlightFlag, setHighlightFlag] = useState<boolean>(false);

    const [keyLock, setKeyLock] = useState<boolean>(false);

    const [autoReveal, setAutoReveal] = useState<boolean>(options.autoReveal);
    const [speedFactor, setSpeedFactor] = useState<number>(options.speedFactor);

    const handleNextStep = useCallback(() => {
        console.log("handleNextStep");
        const prevCursorIdx = state.cursor.index;
        const item = revealGen.current.next();
        if (state.cursor.index !== prevCursorIdx && state.cursor.index >= 0) {
            const team = state.teamStates[state.cursor.index];
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const element = document.querySelector<HTMLTableRowElement>(`#team-id-${team.info.id}`)!;
            const rect = element.getBoundingClientRect();
            window.scrollTo({ left: 0, top: window.scrollY + rect.top - window.innerHeight / 2, behavior: "smooth" });
        }
        console.log("cursor index = ", state.cursor.index);
        if (!item.done) {
            if (item.value) {
                const value = item.value;
                void (async (): Promise<void> => {
                    console.log("reveal highlight");
                    setKeyLock(true);
                    console.log("locked");
                    setHighlightItem(value);

                    let delay = options.shiningBeforeReveal ? 1200 : 400;
                    await util.delay(delay / speedFactor);
                    handleNextStep();

                    delay = value.accepted ? 800 : 300;
                    await util.delay(delay / speedFactor);
                    handleNextStep();

                    setKeyLock(false);
                    console.log("unlocked");
                })();
            } else {
                setHighlightItem(null);
            }
        } else {
            setHighlightItem(null);
        }
        setState({ ...state });
        return item.done;
    }, [state, speedFactor, options.shiningBeforeReveal]);

    // useEffect(() => {
    //     if (state.cursor.tick === 0) {
    //         const team = state.teamStates[state.cursor.index];
    //         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    //         const element = document.querySelector<HTMLTableRowElement>(`#team-id-${team.info.id}`)!;
    //         const dis = element.getBoundingClientRect().top + window.scrollY;
    //         const dur = 10;
    //         let count = 0;
    //         const frame = () => {
    //             window.scrollBy({ left: 0, top: dis / dur / 60, behavior: "auto" });
    //             count += 1;
    //             if (count < dur * 60) {
    //                 window.requestAnimationFrame(frame);
    //             } else {
    //                 setKeyLock(false);
    //             }
    //         };
    //         setKeyLock(true);
    //         setTimeout(() => {
    //             window.requestAnimationFrame(frame);
    //         }, 2000);
    //     }
    // }, [state]);

    useEffect(() => {
        if (state.cursor.tick === 0) {
            const team = state.teamStates[state.cursor.index];
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const element = document.querySelector<HTMLTableRowElement>(`#team-id-${team.info.id}`)!;
            element.scrollIntoView({ behavior: "smooth" });
        }
    }, [state]);

    const handleKeydown = useCallback((e: KeyboardEvent) => {
        console.log("keydown", e.key);
        if (e.key === "Enter") {
            if (keyLock) {
                return;
            }
            handleNextStep();
        }
        if (e.key === "p") {
            setAutoReveal(a => {
                if (a) {
                    console.log("disable autoReveal");
                } else {
                    console.log("enable autoReveal");
                }
                return !a;
            });
        }
        if (e.key === "+") {
            const s = speedFactor + 0.1;
            if (s > 10) { return; }
            setSpeedFactor(s);
            console.log("speedFactor", s);
        }
        if (e.key === "-") {
            const s = speedFactor - 0.1;
            if (s < 0.1) { return; }
            setSpeedFactor(s);
            console.log("speedFactor", s);
        }
    }, [handleNextStep, keyLock, speedFactor]);

    useEffect(() => {
        document.addEventListener("keydown", handleKeydown);
        return () => document.removeEventListener("keydown", handleKeydown);
    }, [handleKeydown]);

    const handleClick = useCallback(() => {
        if (keyLock) { return; }
        console.log("click");
        handleNextStep();
    }, [handleNextStep, keyLock]);

    useEffect(() => {
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [handleClick]);

    useEffect(() => {
        if (state.cursor.tick !== 0 && autoReveal && state.cursor.index >= 0) {
            const timer = setInterval(() => {
                if (keyLock) { return; }
                const done = handleNextStep();
                if (done) { clearInterval(timer); }
            }, 500 / speedFactor);
            return () => clearInterval(timer);
        }
    }, [state, keyLock, handleNextStep, autoReveal, speedFactor]);

    useEffect(() => {
        if (highlightItem && options.shiningBeforeReveal) {
            setHighlightFlag(f => !f);
            const timer = setInterval(() => {
                setHighlightFlag(f => {
                    console.log("flag", !f);
                    return !f;
                });
            }, 400);
            return () => clearInterval(timer);
        }
    }, [highlightItem, options]);

    return (
        <StickyContainer style={{ width: "100%" }}>
            <Sticky>
                {({ style }) => (
                    <table
                        style={{
                            width: "100%",
                            fontSize: "2em",
                            textAlign: "center",
                            backgroundColor: "white",
                            zIndex: 1024,
                            boxShadow: "0 5px 8px 4px rgba(0, 0, 0, 0.09)",
                            ...style
                        }}
                    >
                        <thead>
                            <tr>
                                <th style={{ width: "5%" }}>
                                    <span
                                        style={{
                                            position: "absolute", zIndex: 2048, top: 0, left: 0,
                                            borderRadius: "50%", width: "6px", height: "6px",
                                            backgroundColor: keyLock ? "#ff4d4f" : "#52c41a"
                                        }}
                                    />
                                    Rank
                                </th>
                                <th style={{ width: "25%" }}>
                                    Team
                                </th>
                                <th style={{ width: "10%" }}>
                                    Score
                                </th>
                                {data.problems.map(p => (
                                    <th
                                        key={p.id}
                                        style={{
                                            width: `${60 / data.problems.length}%`,
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center"
                                            }}
                                        >
                                            <strong style={{ marginRight: "0.5em" }}>{p.tag}</strong>
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    width: "1em",
                                                    height: "1em",
                                                    backgroundColor: p.color,
                                                    borderRadius: "50%"
                                                }}
                                            />
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    </table>
                )}
            </Sticky>

            <FlipMove
                style={{
                    width: "100%",
                    overflowAnchor: "none",
                    fontSize: "2em",
                    textAlign: "center",
                }}
                duration={2000 / speedFactor}
            >

                {state.teamStates.map((team, idx) => {
                    const isFocused = idx === state.cursor.index;

                    return (
                        <table
                            key={team.info.id}
                            id={`team-id-${team.info.id}`}
                            style={{
                                width: "100%",
                                boxShadow:
                                    isFocused ?
                                        "0 5px 12px 4px rgba(0, 0, 0, 0.09), 0 -5px 12px 4px rgba(0, 0, 0, 0.09)"
                                        : undefined
                            }}
                        >
                            <tbody>
                                <tr>
                                    <td style={{ width: "5%" }}>
                                        {team.rank}
                                    </td>
                                    <td style={{ width: "25%" }}>
                                        {team.info.name}
                                    </td>
                                    <td style={{ width: "10%" }}>
                                        {`${team.solved} - ${Math.floor(team.penalty / 60000)}`}
                                    </td>
                                    {team.problemStates.map((p) => {
                                        const isHighlighted = highlightItem
                                            && highlightItem.teamId === team.info.id
                                            && highlightItem.problemId === p.info.id;

                                        const grid = (style: CSSProperties) => (
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    minWidth: "4em",
                                                    minHeight: "1em",
                                                    borderRadius: "0.25em",
                                                    backgroundColor: cvtColor(p.state),
                                                    color: "white",
                                                    transition: `opacity ${duration}ms ease-in-out`,
                                                    opacity: 1,
                                                    ...style
                                                }}
                                                ref={isHighlighted ? highlightNodeRef : null}
                                            >
                                                {p.state === vo.ProblemStateKind.Passed ?
                                                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                                    `${p.tryCount} - ${Math.floor(p.acceptTime! / 60000)}`
                                                    : `${p.tryCount}`
                                                }
                                            </span>
                                        );

                                        const duration = 400 / speedFactor;
                                        const transitionStyles = {
                                            entering: { opacity: 0 },
                                            entered: { opacity: 0 },
                                            exiting: { opacity: 1 },
                                            exited: { opacity: 1 },
                                            unmounted: {}
                                        };

                                        const wrappedGrid = isHighlighted ? (
                                            <Transition
                                                in={highlightFlag}
                                                timeout={duration}
                                                nodeRef={highlightNodeRef}
                                            >
                                                {(state) => grid(transitionStyles[state])}
                                            </Transition>
                                        ) : grid({});

                                        return (
                                            <td key={p.info.id} style={{ width: `${60 / team.problemStates.length}%` }}>
                                                {wrappedGrid}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    );
                })}
            </FlipMove>
        </StickyContainer>
    );
};

export default Board;