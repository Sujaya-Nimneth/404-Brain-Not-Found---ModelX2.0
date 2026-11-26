import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected rendering error occurred.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ATIE mobile render error:", error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} accessibilityRole="alert">
          <View style={styles.card}>
            <Text style={styles.tag}>RECOVERY MODE</Text>
            <Text style={styles.title}>Something interrupted this screen.</Text>
            <Text style={styles.message}>{this.state.message}</Text>
            <TouchableOpacity
              onPress={this.handleReset}
              style={styles.button}
              accessibilityRole="button"
              accessibilityLabel="Reload ATIE view"
            >
              <Text style={styles.buttonText}>Reload view</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.cream,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.clay30,
    padding: 24,
    alignItems: "center",
  },
  tag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8b3e2b",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink60,
    textAlign: "center",
    marginBottom: 18,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    backgroundColor: colors.ink,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: colors.cream,
    fontSize: 14,
    fontWeight: "800",
  },
});
