import prism from "@theme-ui/prism/presets/prism.json";

export default {
  space: [0, 4, 8, 16, 24, 32, 48, 64, 96, 128, 172, 256, 512],
  fonts: {
    body: "IBM Plex Sans, relative-book-pro, Roboto, system-ui, -apple-system, BlinkMacSystemFont",
    faux: "IBM Plex Sans, relative-faux-book-pro, Roboto, system-ui, -apple-system, BlinkMacSystemFont",
    heading:
      "IBM Plex Sans, relative-medium-pro, Roboto, system-ui, -apple-system, BlinkMacSystemFont",
    mono: "BerkleyMono, relative-mono-11-pitch-pro, Menlo, monospace",
  },
  fontSizes: [12, 14, 16, 18, 24, 34, 48, 64, 80, 96, 128],
  letterSpacings: {
    body: "0.01em",
    mono: "0.07em",
    faux: "0.05em",
    heading: "-0.015em",
    smallcaps: "0.07em",
  },
  fontWeights: {
    body: 400,
    heading: 600,
    bold: 600,
  },
  colors: {
    text: "#F8F9FA",
    background: "#212529",
    primary: "#F8F9FA",
    secondary: "#ADB5BD",
    accent: "#6C757D",
    highlight: "#495057",
    muted: "#343A40",
    hinted: "#2a2c30",
    red: "#f07071",
    orange: "#ea9755",
    yellow: "#d4c05e",
    green: "#7eb36a",
    teal: "#64b9c4",
    blue: "#85a2f7",
    purple: "#bc85d9",
    pink: "#e587b6",
    grey: "#a9b4c4",
    modes: {
      light: {
        text: "#212529",
        background: "#F8F9FA",
        primary: "#212529",
        secondary: "#495057",
        accent: "#ADB5BD",
        highlight: "#CED4DA",
        muted: "#DEE2E6",
        hinted: "#E9ECEF",
        red: "#f07071",
        orange: "#ea9755",
        yellow: "#d4c05e",
        green: "#7eb36a",
        teal: "#64b9c4",
        blue: "#85a2f7",
        purple: "#bc85d9",
        pink: "#e587b6",
        grey: "#a9b4c4",
      }
    }
  },
  text: {
    fontSize: 1,
    detail: {
      fontSize: 0,
      fontWeight: "body",
      fontStyle: "normal",
      fontFamily: "mono"
    },
    paragraph: {
      mt: 2,
      mb: 1,
      fontSize: 1,
      lineHeight: "1.5em"
    },
    description: {
      fontSize: 1,
      fontWeight: "body",
      fontStyle: "italic",
      fontFamily: "body",
      color: "secondary",
      mt: 1,
      mb: 0,
    },
    heading: {
      mt: 3,
      mb: 1,
    },
    tag: {
      fontFamily: "mono",
      fontSize: 0,
      fontWeight: "body",
      fontStyle: "normal",
      p: 0
    },
    title: {
      m: 0,
      fontSize: 3,
    },
    footer: {
      fontFamily: "mono",
      fontSize: 0,
      fontWeight: "bold",
      fontStyle: "normal"
    }
  },
  forms: {
    input: {
      borderColor: 'accent',
      '&:focus': {
        borderColor: 'primary',
        outline: 'none',
      },
      backgroundColor: "muted",
      fontFamily: "mono",
      fontSize: 1,
      borderRadius: 0,
      "&:disabled": {
        backgroundColor: "hinted",
        color: "accent"
      }
    },
    textarea: {
      backgroundColor: "muted",
      borderRadius: 0,
      borderColor: 'accent',
      fontFamily: "mono",
      fontSize: 1,
      '&:focus': {
        borderColor: 'primary',
        outline: 'none',
      },
      "&:disabled": {
        backgroundColor: "hinted",
        color: "accent"
      },
      resize: "none"
    },
    label: {
      fontSize: 0,
      fontFamily: "mono",
      alignItems: "center"
    },
    checkbox: {
      borderRadius: 0,
      border: 1,
      borderColor: "accent"
    },
    select: {
      fontSize: 1,
      fontFamily: "mono",
      borderRadius: 0,
      borderColor: "accent",
      backgroundColor: "muted",
      "&:disabled": {
        backgroundColor: "hinted",
        color: "accent"
      }
    }
  },
  buttons: {
    primary: {
      textTransform: "uppercase",
      px: 2,
      py: 2,
      m: 0,
      color: "background",
      borderRadius: 0,
      backgroundColor: "primary",
      cursor: "pointer",
      fontFamily: "mono",
      fontSize: 2,
      fontWeight: "body",
      "&:hover": {
        color: "highlight"
      },
      "&:disabled": {
        color: "background",
        backgroundColor: "highlight",
        cursor: "not-allowed"
      }
    },
    success: {
      textTransform: "uppercase",
      px: 2,
      py: 2,
      m: 0,
      color: "background",
      borderRadius: 0,
      backgroundColor: "green",
      cursor: "pointer",
      fontFamily: "mono",
      fontSize: 2,
      fontWeight: "body",
      "&:hover": {
        color: "highlight"
      },
      "&:disabled": {
        color: "background",
        backgroundColor: "highlight",
        cursor: "not-allowed"
      }
    },
    error: {
      textTransform: "uppercase",
      px: 2,
      py: 2,
      m: 0,
      color: "background",
      borderRadius: 0,
      backgroundColor: "red",
      cursor: "pointer",
      fontFamily: "mono",
      fontSize: 2,
      fontWeight: "body",
      "&:hover": {
        color: "highlight"
      },
      "&:disabled": {
        color: "background",
        backgroundColor: "highlight",
        cursor: "not-allowed"
      }
    },
    nav: {
      textTransform: "uppercase",
      m: 0,
      p: [2,2,2,2],
      textAlign: "right",
      width: "100%",
      backgroundColor: "primary",
      color: "background",
      borderRadius: 0,
      cursor: "pointer",
      fontFamily: "mono",
      fontSize: [0,0,1,1],
      fontWeight: "body",
      "&:hover": {
        color: "highlight"
      },
      "&:disabled": {
        color: "background",
        backgroundColor: "highlight"
      }
    }
  },
  images: {
    profileImage: {
      borderRadius: 0,
      border: "3px solid",
      borderColor: "primary",
      width: "180.6px",
      height: "180.6px"
    },
    navProfileImage: {
      borderRadius: 0,
      border: "3px solid",
      borderColor: "primary",
      cursor: "pointer",
      width: "50px",
      height: "50px"
    },
  },
  cards: {
    tag: {
      px: 1,
      py: "2px",
      textDecoration: "none",
      fontSize: 0,
      fontFamily: "mono",
      maxWidth: "fit-content"
    },
    blockquote: {
      fontStyle: "italic",
      fontSize: 2,
      fontWeight: "body",
      fontFamily: "body",
      color: "secondary",
      textAlign: "left",
      my: 2,
      py: 2,
      px: 4,
      borderColor: "secondary",
      borderStyle: "solid",
      borderWidth: "1px",
      backgroundColor: "muted"
    },
    code: {
      my: 1,
      borderStyle: "solid",
      borderWidth: "1px",
      borderColor: "secondary",
      backgroundColor: "muted",
      p: 2,
      position: "relative",
      maxWidth: "100%",
      fontFamily: "mono",
      overflowWrap: "anywhere",
      overflowX: "auto",
      fontSize: 0,
      pre: {
        borderWidth: 0,
        px: 0,
        transform: "translateY(0em)",
        overflowWrap: "anywhere",
        overflowX: "auto",
        fontFamily: "mono",
        fontSize: 0,
        m: 0
      },
    },
    inlineCode: {
      display: "inline",
      my: 0,
      borderStyle: "solid",
      borderWidth: "1px",
      borderColor: "secondary",
      backgroundColor: "muted",
      px: 1,
      position: "relative",
      maxWidth: "100%",
      width: "fit-content",
      fontFamily: "mono",
      fontSize: 0
    },
    listing: {
      borderStyle: "none none none solid",
      borderWidth: "0px",
      borderColor: "secondary",
      pl: 0
    }
  },
  alerts: {
    primary: {
      color: "text",
      bg: "red",
      fontFamily: "mono",
      justifyContent: "center",
      textAlign: "center",
      borderRadius: 0,
    },
    success: {
      color: "text",
      bg: "green",
      fontFamily: "mono",
      justifyContent: "center",
      textAlign: "center",
      borderRadius: 0,
    },
    warning: {
      color: "text",
      bg: "orange",
      fontFamily: "mono",
      justifyContent: "center",
      textAlign: "center",
      borderRadius: 0,
    },
    error: {
      color: "text",
      bg: "red",
      fontFamily: "mono",
      justifyContent: "center",
      textAlign: "center",
      borderRadius: 0,
    },
    info: {
      color: "text",
      bg: "accent",
      fontFamily: "mono",
      justifyContent: "center",
      textAlign: "center",
      borderRadius: 0,
    },
  },
  links: {
    color: "text",
    "&:hover": {
      color: "secondary"
    },
    breadcrumb: {
      color: "secondary",
      "&:hover": {
        textDecoration: "underline",
        color: "primary"
      }
    },  
    footer: {
      fontFamily: "mono",
      fontSize: 0,
      fontWeight: "bold",
      fontStyle: "normal",
      color: "text",
      textDecoration: "underline",
      textTransform: "uppercase",
      "&:hover": {
        color: "secondary"
      }
    },
    link: {
      cursor: "pointer",
      fontStyle: "normal",
      color: "text",
      textDecoration: "underline",
      "&:hover": {
        color: "secondary",
        textDecoration: "underline"
      },
    },
    tag: {
      textDecoration: "none",
    },
    navLink: {
      cursor: "pointer",
      fontStyle: "normal",
      color: "accent",
      textDecoration: "none",
      textTransform: "uppercase",
      "&:hover": {
        color: "text",
        textDecoration: "underline"
      },
    },
    navLinkActive: {
      cursor: "pointer",
      fontStyle: "normal",
      color: "text",
      textDecoration: "underline",
      textTransform: "uppercase",
      "&:hover": {
        color: "text",
        textDecoration: "underline"
      },
    },
    navLinkExpanded: {
      display: "block",
      cursor: "pointer",
      fontStyle: "normal",
      color: "secondary",
      textDecoration: "none",
      textTransform: "uppercase",
      "&:hover": {
        color: "text",
        textDecoration: "underline"
      },
    }
  },
  layout: {
    container: {
      px: [3, 4, 5, 6],
    },
  },
  styles: {
    root: {
      fontFamily: "body",
      lineHeight: "body",
      fontWeight: "body",
      letterSpacing: "body",
      textUnderlineThickness: "max(0.08em, 1px)",
      textUnderlineOffset: "0.15em",
    },
    ul: {
      mt: 1,
      mb: 2,
      fontSize: 1,
      fontFamily: "body",
    },
    ol: {
      fontSize: 1,
      mt: 1,
      mb: 2,
      fontFamily: "body",
    },
    table: {
      width: "100%",
      fontSize: 1,
      fontFamily: "body",
      borderColor: "secondary",
      borderWidth: "1px",
      borderStyle: "solid",
      borderCollapse: "collapse"
    },
    th: {
      backgroundColor: "accent",
      borderColor: "secondary",
      borderWidth: "1px",
      borderStyle: "solid",
      fontSize: 1,
      p: 1,
    },
    tr: {
      borderColor: "secondary",
      borderWidth: "1px",
      borderStyle: "solid",
      "&:nth-child(even)": {
        backgroundColor: "muted"
      }
    },
    td: {
      borderColor: "secondary",
      borderWidth: "1px",
      borderStyle: "solid",
      p: 1
    },
  },
  breakpoints: ["40em", "64em", "102em"],
  config: {
    initialColorModeName: "light",
    printColorModeName: "light",
    useColorSchemeMediaQuery: false,
  },
};
