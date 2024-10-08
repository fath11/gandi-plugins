import * as React from "react";
import * as LiveKit from "livekit-client";
import styles from "./styles.less";
import ReactDOM from "react-dom";
import VoiceIcon from "assets/icon--voice.svg";
import { Avatar, Box, Button, GandiProvider, Tooltip } from "@gandi-ide/gandi-ui";
import toast, { Toaster } from "react-hot-toast";
import { connectToRoom } from "./lib/livekit";
import { Member } from "./components/MemberList/MemberListItem";
import classNames from "classnames";
import LeaveCallIcon from "assets/icon--voice--off-white.svg";
import { IntlShape } from "react-intl";
import VoiceFloatingNew from "./components/VoiceFloatingNew/VoiceFloatingNew";
import dots from "./dots.less";

const globalCss = `
:root[theme=light] {
    --voice-plugin-divider: #DCE0E5;
    --voice-plugin-button: #6B7280;
    --voice-plugin-border: #DCE0E5;
    --voice-plugin-bg: #F7F7F7;
    --voice-plugin-hover: rgba(156, 163, 175, 0.16);
}

:root[theme=dark] {
    --voice-plugin-divider: #3E495B;
    --voice-plugin-button: #D1D5DB;
    --voice-plugin-border: #3E495B;
    --voice-plugin-bg: #2E3644;
    --voice-plugin-hover: rgba(156, 163, 175, 0.15);
}

.chakra-menu__menu-list {
    button {
        div {
          span {
              color: var(--theme-text-primary) !important;
          }
        }
    }
    button:hover {
        background: var(--theme-brand-color) !important;
        div {  
            span {
                color: #fff !important;
            }
        }
    }
}
`;

interface ITokenRequest {
  clientId: string;
  creationId: string;
  authority: string;
}

interface IToken {
  token: string;
}

const mentionAudio = new Audio(
  "https://zhishi.oss-cn-beijing.aliyuncs.com/user_projects_assets/65eea7ba445c03e8830c0e9e3280af13.mp3",
);
const newTeamMember = new Audio(
  "https://zhishi.oss-cn-beijing.aliyuncs.com/user_projects_assets/b6c6c4793d2636bfe24ce8c3a573c7f0.mp3",
);

const LocalizationContext = React.createContext<IntlShape>(null);
const RoomContext = React.createContext<LiveKit.Room>(null);
const VoiceContext = React.createContext<PluginContext>(null);
const VoiceCooperation: React.FC<PluginContext> = (pluginContext: PluginContext) => {
  // const toast = useMessage({ followCursor: false });
  const { msg } = pluginContext;
  const [room, setRoom] = React.useState<LiveKit.Room>(null);
  const [voiceMemberList, setVoiceMemberList] = React.useState<Array<Member>>([]);
  const voiceMemberListRef = React.useRef<Array<Member>>([]);
  const roomRef = React.useRef<LiveKit.Room>();
  roomRef.current = room;
  voiceMemberListRef.current = voiceMemberList;

  const [isLoading, setIsLoading] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  React.useEffect(() => {
    // 注入css
    const style = document.createElement("style");
    style.innerHTML = globalCss;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const handleClick = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMicrophone = devices.some((device) => device.kind === "audioinput");
      if (!hasMicrophone) {
        toast.error(msg("plugins.voiceCooperation.errorMsgPermission"), {
          position: "top-center",
        });
        return;
      }
    } catch (error) {
      toast.error(msg("plugins.voiceCooperation.errorMsgPermission"), {
        position: "top-center",
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      toast.error(msg("plugins.voiceCooperation.errorMsgPermission"), {
        position: "top-center",
      });
      return;
    }
    setIsMuted(false);
    if (pluginContext.teamworkManager === null) {
      toast.error(msg("plugins.voiceCooperation.errorNotInCooperation"), {
        position: "top-center",
      });
      return;
    }
    if (room !== null) {
      room.disconnect();
      return;
    }
    setIsLoading(true);
    const creationId = pluginContext.teamworkManager.creationInfo.id;
    const authority = pluginContext.teamworkManager.userInfo.authority;
    const clientId = pluginContext.teamworkManager.userInfo.clientId;
    try {
      const tokenReq = await pluginContext.server.axios.post<ITokenRequest, IToken>(
        `${pluginContext.server.hosts.GANDI_MAIN}/rtc/join`,
        {
          creationId: creationId,
          authority: authority,
          clientId: clientId,
        },
        {
          withCredentials: true,
        },
      );
      if (!tokenReq.token) {
        throw new Error();
      }
      const token = tokenReq.token;
      connectToRoom(token, (connected: boolean, _room?: LiveKit.Room) => {
        if (connected) {
          // 播放音效
          mentionAudio.play();
          setRoom(_room);
          roomRef.current = _room;
        } else {
          setRoom(null);
          roomRef.current = null;
          mentionAudio.play();
          setVoiceMemberList([]);
          voiceMemberListRef.current = [];
        }
        setIsConnected(connected);
        setIsLoading(false);
        if (_room) {
          fetchCurrentUserList(_room);
          roomEventRegister(_room);
          _room.remoteParticipants.forEach((participant) => {
            if (participant.getTrackPublications().length > 0) {
              participant.getTrackPublications().forEach((track) => {
                if (track.kind === LiveKit.Track.Kind.Audio) {
                  handleNewTrack(track.track as LiveKit.RemoteAudioTrack);
                }
              });
            }
          });
        }
      });
    } catch (error) {
      setIsConnected(false);
      setIsLoading(false);
      setVoiceMemberList([]);
      voiceMemberListRef.current = [];
      setRoom(null);
      roomRef.current = null;
      if (error instanceof LiveKit.PublishDataError) {
        toast.error(msg("plugins.voiceCooperation.errorMsgPermission"), {
          position: "top-center",
        });
      }
      toast.error(msg("plugins.voiceCooperation.error"), {
        position: "top-center",
      });
      console.error("Failed to obtain token", error);
    }
    return;
  };
  const handleParticipantChanged = React.useCallback(() => {
    if (room) {
      fetchCurrentUserList(room);
    }
  }, [room]);
  const fetchCurrentUserList = (room: LiveKit.Room) => {
    if (!room) return;
    if (room.state !== LiveKit.ConnectionState.Connected) return;
    const tempList = [];
    const localUser = pluginContext.teamworkManager.onlineUsers.get(pluginContext.teamworkManager.userInfo.clientId);
    if (!localUser) return;
    const localUserInfo = {
      ...localUser,
      isMuted: !room.localParticipant.isMicrophoneEnabled,
      isSpeaking: false,
      isLocal: true,
      isMutedByAdmin: false,
    };
    tempList.push(localUserInfo);
    room.remoteParticipants.forEach((participant) => {
      const cid = participant.identity;
      const userInfo = Array.from(pluginContext.teamworkManager.onlineUsers).find((member) => {
        return member[1].clientId === cid;
      })[1];
      if (!userInfo) return;
      const remoteUserInfo = {
        ...userInfo,
        isMuted: !participant.isMicrophoneEnabled,
        isSpeaking: false,
        isLocal: false,
        isMutedByAdmin: false,
      };
      tempList.push(remoteUserInfo);
    });
    setVoiceMemberList(tempList);
    voiceMemberListRef.current = tempList;
  };

  const roomEventRegister = (room: LiveKit.Room) => {
    room
      ?.on(LiveKit.RoomEvent.TrackSubscribed, handleNewTrack)
      .on(LiveKit.RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(LiveKit.RoomEvent.Reconnected, () => handleReconnect(room))
      .on(LiveKit.RoomEvent.TrackMuted, () => fetchCurrentUserList(room))
      .on(LiveKit.RoomEvent.TrackUnmuted, () => fetchCurrentUserList(room))
      .on(LiveKit.RoomEvent.ParticipantConnected, () => newTeamMember.play())
      .on(LiveKit.RoomEvent.ConnectionQualityChanged, handleQualityChanged);
  };

  const handleNewTrack = (track: LiveKit.RemoteAudioTrack) => {
    fetchCurrentUserList(roomRef.current);
    const element = track.attach();
    const parentElement = document.body;
    element.id = track.sid;
    element.classList.add("voiceAudio");
    parentElement.appendChild(element);
  };
  const handleTrackUnsubscribed = (track: LiveKit.RemoteAudioTrack) => {
    const element = track.detach();
    element.forEach((e) => {
      document.getElementById(e.id).remove();
    });
  };

  React.useEffect(() => {
    voiceMemberListRef.current = voiceMemberList;
  }, [voiceMemberList]);

  const handleActiveSpeakersChanged = (speakers: Array<LiveKit.Participant>) => {
    const activeSpeakers = voiceMemberListRef.current.filter((member) =>
      speakers.some((speaker) => speaker.identity === member.clientId),
    );

    setVoiceMemberList((prevList) =>
      prevList.map((member) => {
        if (activeSpeakers.some((active) => active.clientId === member.clientId)) {
          return { ...member, isSpeaking: true };
        } else {
          return { ...member, isSpeaking: false }; // 如果需要将其他用户的 isSpeaking 设置为 false
        }
      }),
    );
  };

  React.useEffect(() => {
    room
      ?.on(LiveKit.RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
      .on(LiveKit.RoomEvent.ParticipantConnected, handleParticipantChanged)
      .on(LiveKit.RoomEvent.ParticipantDisconnected, handleParticipantChanged);
    return () => {
      room
        ?.off(LiveKit.RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
        .off(LiveKit.RoomEvent.ParticipantConnected, handleParticipantChanged)
        .off(LiveKit.RoomEvent.ParticipantDisconnected, handleParticipantChanged);
    };
  }, [room]);

  const handleReconnect = (room: LiveKit.Room) => {
    setIsConnected(true);
    setIsLoading(false);
    fetchCurrentUserList(room);
    setRoom(room);
    roomRef.current = room;
  };
  React.useEffect(() => {
    return () => {
      const cleanup = async () => {
        await roomRef.current?.disconnect();
      };
      cleanup();
      setRoom(null);
      roomRef.current = null;
      // PostAction: cleanup room
    };
  }, []);
  const containerRef = React.useRef(null);
  const onLeave = () => {
    if (room) {
      room.disconnect();
    }
  };
  const onToggleMicrophone = () => {
    if (room) {
      room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled).then(
        () => {
          setIsMuted(!room.localParticipant.isMicrophoneEnabled);
        },
        (e) => {
          console.error("Failed to toggle microphone", e);
        },
      );
    }
  };
  React.useEffect(() => {
    const element = document.createElement("div");
    element.id = "audioFloatingWrapper";
    document.body.appendChild(element);
    return () => {
      document.body.removeChild(element);
    };
  }, []);

  const handleQualityChanged = (quality: LiveKit.ConnectionQuality, participant: LiveKit.Participant) => {
    console.log(quality, participant);
    if (quality === LiveKit.ConnectionQuality.Poor || quality === LiveKit.ConnectionQuality.Lost) {
      const user = voiceMemberListRef.current.filter((member) => member.clientId === participant.identity)[0];
      toast(
        () => {
          return (
            <GandiProvider>
              <span>
                <Avatar
                  name={user.userInfo.name}
                  src={user.userInfo.avatar}
                  size="sm"
                  sx={{
                    width: "24px",
                    height: "24px",
                  }}
                />
                <Box sx={{ marginLeft: "8px", fontSize: "12px" }}>
                  {pluginContext.intl.formatMessage(
                    {
                      id: "plugins.voiceCooperation.badConnection",
                    },
                    {
                      name: user.userInfo.name,
                    },
                  )}
                </Box>
              </span>
            </GandiProvider>
          );
        },
        {
          duration: 5 * 1000,
        },
      );
    }
  };

  const [isMuted, setIsMuted] = React.useState(false);
  if (!pluginContext.teamworkManager) {
    return null;
  }

  return ReactDOM.createPortal(
    <VoiceContext.Provider value={pluginContext}>
      <Toaster />
      <RoomContext.Provider value={room}>
        <LocalizationContext.Provider value={pluginContext.intl}>
          <GandiProvider
            resetCSS={false}
            theme={{
              semanticTokens: {
                colors: {
                  "bg-module": {
                    _dark: "var(--theme-color-600)",
                    _light: "var(--theme-color-600)",
                  },
                },
              },
              styles: {
                global: {
                  body: {
                    color: "unset",
                  },
                },
              },
              components: {
                Tooltip: {
                  baseStyle: {
                    "--tooltip-bg": "var(--theme-color-600)",
                    "--popper-arrow-bg": "var(--theme-color-600)",
                    background: "var(--theme-color-600)",
                    height: "44px",
                    padding: "0 16px",
                    border: "var(--theme-border-size-tip) solid var(--theme-border-color-tip)",
                    "border-radius": "8px",
                    "box-shadow": "0px 4px 4px rgba(0, 0, 0, 0.25)",
                    transform: "translate(-50%, 0)",
                    "white-space": "nowrap",
                    display: "flex",
                    "align-items": "center",
                    "justify-content": "space-between",
                  },
                },
                Menu: {
                  baseStyle: {
                    list: {
                      "--menu-color-hover-bg": "var(--theme-brand-color)",
                      bg: "var(--voice-plugin-bg)",
                      width: "104px",
                    },
                    item: {
                      bg: "var(--voice-plugin-bg)",
                      color: "var(--theme-text-primary)",
                      _hover: {
                        bg: "var(--theme-brand-color) !important",
                      },
                    },
                  },
                },
              },
            }}
          >
            <section className={styles.voiceRoot} ref={containerRef}>
              <Tooltip
                label={
                  isConnected
                    ? msg("plugins.voiceCooperation.leave")
                    : !isLoading && msg("plugins.voiceCooperation.join")
                }
              >
                <Button
                  className={classNames({
                    [styles.voiceButton]: true,
                    [styles.voiceButtonConnected]: isConnected,
                    [styles.voiceButtonLoading]: isLoading,
                  })}
                  colorScheme="green"
                  border={"none"}
                  variant={"ghost"}
                  onClick={isConnected ? onLeave : handleClick}
                  disabled={isLoading}
                  sx={{
                    height: "32px",
                    width: "32px",
                    borderRadius: "6px",
                  }}
                >
                  <span className={styles.buttonIcon}>
                    {isConnected && <LeaveCallIcon />}
                    {!isConnected && !isLoading && <VoiceIcon />}
                    {isLoading && (
                      <div
                        className={dots.loadingDots}
                        style={{
                          width: "18px !important",
                          height: "18px !important",
                          // display: "flex",
                          // alignItems: "center",
                        }}
                      >
                        <div></div>
                        <div></div>
                        <div></div>
                      </div>
                    )}
                  </span>
                </Button>
              </Tooltip>
              {isConnected &&
                ReactDOM.createPortal(
                  <VoiceFloatingNew
                    intl={pluginContext.intl}
                    members={voiceMemberList}
                    isMicrophoneMuted={isMuted}
                    onToggleMicrophone={onToggleMicrophone}
                    onLeave={onLeave}
                  />,
                  document.getElementById("audioFloatingWrapper"),
                )}
            </section>
          </GandiProvider>
        </LocalizationContext.Provider>
      </RoomContext.Provider>
    </VoiceContext.Provider>,
    document.querySelector("[class^='gandi_teamwork_wrapper']"),
  );
};

VoiceCooperation.displayName = "VoiceCooperation";

export { VoiceCooperation as default, LocalizationContext, RoomContext, VoiceContext };
